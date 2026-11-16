import { redirect } from 'next/navigation';

/**
 * There is no dedicated wind-speed alerts page; wind alerts are listed with
 * the others on /alerts. Keep the old URL working instead of 404ing
 * (agri-web#173).
 */
export default function WindSpeedAlertsPage(): never {
  redirect('/alerts');
}
