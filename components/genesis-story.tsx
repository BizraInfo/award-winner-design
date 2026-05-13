"use client"

import { motion } from "framer-motion"

export function GenesisStory() {
  return (
    <section className="py-32 px-4 relative z-10 overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-3xl p-8 md:p-16 relative">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-gold to-transparent opacity-30"></div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <div>
              <h3 className="font-arabic text-3xl md:text-4xl text-primary-gold mb-4">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</h3>
              <p className="font-serif italic text-soft-white/60">In the name of God, the Most Merciful, the Most Compassionate</p>
            </div>

            <div className="space-y-6 text-lg md:text-xl leading-relaxed font-light text-soft-white/90">
              <p>
                In Ramadan 2023, before code, before business plans, before architecture,
                two Arabic documents were written. They were something far older and far
                more honest: a human being searching for meaning, dignity, and a way to
                build without betraying the heart.
              </p>
              <p>
                <strong>BIZRA was not named after the product. The product grew from the name.</strong>
                {' '}Three years later, the seed became an architecture — but it remains, at its core, the same seed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
              <div className="p-6 border border-primary-gold/10 rounded-xl bg-deep-navy/50">
                <h4 className="text-primary-gold font-serif text-xl mb-2">The Seed — البذرة</h4>
                <p className="text-sm text-soft-white/60">The first origin paper. It carried the seed of freedom — financial, spiritual, and mental. Written in Ramadan 2023, before any system existed.</p>
              </div>
              <div className="p-6 border border-primary-gold/10 rounded-xl bg-deep-navy/50">
                <h4 className="text-primary-gold font-serif text-xl mb-2">The Message — الرسالة</h4>
                <p className="text-sm text-soft-white/60">The second origin paper. A deeply personal declaration that the work ahead must serve meaning before profit, dignity before extraction.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
