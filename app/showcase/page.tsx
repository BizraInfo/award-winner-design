import { containUnreviewedPublicRoute } from '@/lib/public-claims/containment';

export default function ContainedPublicRoutePage() {
  return containUnreviewedPublicRoute();
}
