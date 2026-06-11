import { redirect } from 'next/navigation';

// The admin app serves its routes under /admin/* (preserving the in-app links).
// The bare root just forwards to the admin dashboard.
export default function Home() {
  redirect('/admin');
}
