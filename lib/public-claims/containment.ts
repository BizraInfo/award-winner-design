import { redirect } from 'next/navigation';

export function containUnreviewedPublicRoute(): never {
  redirect('/?containment=public-claim-review');
}
