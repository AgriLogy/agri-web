import NonAuthNavbar from '../components/NonAuthNavbar ';
import LoginBox from './LoginBox';

const NAVBAR_HEIGHT_PX = 82;

export default function LoginPage() {
  return (
    <>
      <NonAuthNavbar />
      <main
        className="flex items-center justify-center px-4 md:px-0 bg-neutral-50 dark:bg-neutral-900"
        style={{ minHeight: `calc(100vh - ${NAVBAR_HEIGHT_PX}px)` }}
      >
        <LoginBox />
      </main>
    </>
  );
}
