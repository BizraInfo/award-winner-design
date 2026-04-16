#!/usr/bin/env node
/**
 * Adversarial tests for G1/G2 gate closure.
 * Tests genesis (client pubkey) and activate (client-signed receipt) endpoints.
 *
 * Uses Node.js native crypto to simulate what WebCrypto does in the browser.
 */

const { generateKeyPairSync, sign, createHash, createPublicKey, verify } = require("node:crypto");

const BASE = "http://localhost:3853";
let pass = 0, fail = 0;

function hex(buf) {
  return Buffer.from(buf).toString("hex");
}
function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function generateClientKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const pubRaw = pubDer.subarray(pubDer.length - 32);
  return { publicKeyHex: hex(pubRaw), publicKeyObj: publicKey, privateKeyObj: privateKey };
}

function clientSign(privateKeyObj, payload) {
  return hex(sign(null, Buffer.from(payload), privateKeyObj));
}

async function test(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log("\n=== G1/G2 ADVERSARIAL TESTS ===\n");

  // ---- GENESIS ENDPOINT ----
  console.log("GENESIS /api/genesis:");

  const kp = generateClientKeypair();

  await test("1. Valid genesis with client pubkey", async () => {
    const { status, data } = await post("/api/genesis", { name: "Mumu", publicKey: kp.publicKeyHex });
    assert(status === 200, `status ${status}`);
    assert(data.nodeId === sha256(Buffer.from(kp.publicKeyHex, "hex")), "nodeId mismatch");
    assert(data.publicKey === kp.publicKeyHex, "publicKey echo mismatch");
    assert(data.agentIds.length === 7, "wrong agent count");
    assert(data.envelope, "no envelope");
    assert(!data.signature, "server should NOT return a signature");
    assert(data.steps.length === 4, `expected 4 steps, got ${data.steps.length}`);
  });

  await test("2. Missing publicKey → 400", async () => {
    const { status } = await post("/api/genesis", { name: "Mumu" });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("3. Invalid publicKey (wrong length) → 400", async () => {
    const { status } = await post("/api/genesis", { name: "Mumu", publicKey: "abcd1234" });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("4. XSS in name with valid pubkey → 400", async () => {
    const { status } = await post("/api/genesis", { name: "<script>alert(1)</script>", publicKey: kp.publicKeyHex });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("5. Missing name → 400", async () => {
    const { status } = await post("/api/genesis", { publicKey: kp.publicKeyHex });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("6. Client can sign returned envelope", async () => {
    const { data } = await post("/api/genesis", { name: "Mumu", publicKey: kp.publicKeyHex });
    const sig = clientSign(kp.privateKeyObj, data.envelope);
    assert(sig.length === 128, `sig hex length ${sig.length}`);
    // Verify locally
    const valid = verify(null, Buffer.from(data.envelope), kp.publicKeyObj, Buffer.from(sig, "hex"));
    assert(valid, "self-verification failed");
  });

  // ---- ACTIVATE ENDPOINT ----
  console.log("\nACTIVATE /api/node/activate:");

  await test("7. Valid client-signed activation receipt", async () => {
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const receipt = JSON.stringify({
      type: "node.activation.v1",
      nodeId: genesis.nodeId,
      resourceSettings: { cpuShare: 20, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] },
      activatedAt: new Date().toISOString(),
      constitutionVersion: "5.0.0-GENESIS",
    });
    const sig = clientSign(kp.privateKeyObj, receipt);
    const { status, data } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: kp.publicKeyHex,
      resourceSettings: { cpuShare: 20, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] },
      receipt,
      signature: sig,
    });
    assert(status === 200, `status ${status}: ${JSON.stringify(data)}`);
    assert(data.signerMode === "genesis_ed25519", `signerMode: ${data.signerMode}`);
    assert(data.verified === true, "not verified");
  });

  await test("8. Wrong key signs receipt → 403", async () => {
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const wrongKp = generateClientKeypair();
    const receipt = JSON.stringify({
      type: "node.activation.v1",
      nodeId: genesis.nodeId,
      resourceSettings: { cpuShare: 10, gpuShare: 0, storageShare: 5, alwaysAvailable: false, availableHours: [8, 18] },
      activatedAt: new Date().toISOString(),
      constitutionVersion: "5.0.0-GENESIS",
    });
    // Sign with wrong key
    const sig = clientSign(wrongKp.privateKeyObj, receipt);
    const { status } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: kp.publicKeyHex,
      resourceSettings: { cpuShare: 10, gpuShare: 0, storageShare: 5, alwaysAvailable: false, availableHours: [8, 18] },
      receipt,
      signature: sig,
    });
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("9. PublicKey doesn't match nodeId → 403", async () => {
    const otherKp = generateClientKeypair();
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const receipt = JSON.stringify({
      type: "node.activation.v1",
      nodeId: genesis.nodeId,
      resourceSettings: { cpuShare: 10, gpuShare: 0, storageShare: 5, alwaysAvailable: true, availableHours: [0, 24] },
      activatedAt: new Date().toISOString(),
      constitutionVersion: "5.0.0-GENESIS",
    });
    const sig = clientSign(otherKp.privateKeyObj, receipt);
    const { status } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: otherKp.publicKeyHex, // different key than what produced nodeId
      resourceSettings: { cpuShare: 10, gpuShare: 0, storageShare: 5, alwaysAvailable: true, availableHours: [0, 24] },
      receipt,
      signature: sig,
    });
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("10. Tampered receipt → 403", async () => {
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const receipt = JSON.stringify({
      type: "node.activation.v1",
      nodeId: genesis.nodeId,
      resourceSettings: { cpuShare: 20, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] },
      activatedAt: new Date().toISOString(),
      constitutionVersion: "5.0.0-GENESIS",
    });
    const sig = clientSign(kp.privateKeyObj, receipt);
    // Tamper: change cpuShare in the receipt AFTER signing
    const tampered = receipt.replace('"cpuShare":20', '"cpuShare":80');
    const { status } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: kp.publicKeyHex,
      resourceSettings: { cpuShare: 80, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] },
      receipt: tampered,
      signature: sig,
    });
    assert(status === 403, `expected 403, got ${status}`);
  });

  await test("11. Missing signature → 400", async () => {
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const { status } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: kp.publicKeyHex,
      resourceSettings: { cpuShare: 10, gpuShare: 0, storageShare: 5, alwaysAvailable: true, availableHours: [0, 24] },
      receipt: "{}",
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("12. storageShare > 80 → 400", async () => {
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const { status } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: kp.publicKeyHex,
      resourceSettings: { cpuShare: 10, gpuShare: 0, storageShare: 99, alwaysAvailable: true, availableHours: [0, 24] },
      receipt: "{}",
      signature: "a".repeat(128),
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await test("13. GET method → 405", async () => {
    const res = await fetch(`${BASE}/api/genesis`);
    assert(res.status === 405, `expected 405, got ${res.status}`);
  });

  await test("14. GET activate → 405", async () => {
    const res = await fetch(`${BASE}/api/node/activate`);
    assert(res.status === 405, `expected 405, got ${res.status}`);
  });

  await test("15. Wrong receipt type → 400", async () => {
    const { data: genesis } = await post("/api/genesis", { name: "TestNode", publicKey: kp.publicKeyHex });
    const receipt = JSON.stringify({
      type: "node.evil.v1",
      nodeId: genesis.nodeId,
      resourceSettings: { cpuShare: 20, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] },
      activatedAt: new Date().toISOString(),
      constitutionVersion: "5.0.0-GENESIS",
    });
    const sig = clientSign(kp.privateKeyObj, receipt);
    const { status } = await post("/api/node/activate", {
      nodeId: genesis.nodeId,
      publicKey: kp.publicKeyHex,
      resourceSettings: { cpuShare: 20, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] },
      receipt,
      signature: sig,
    });
    assert(status === 400, `expected 400, got ${status}`);
  });

  // ---- SUMMARY ----
  console.log(`\n=== RESULTS: ${pass}/${pass + fail} passed ===`);
  if (fail > 0) {
    console.log(`FAILED: ${fail} test(s)`);
    process.exit(1);
  } else {
    console.log("ALL PASSED ✓");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
