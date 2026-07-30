import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { HiArrowUp } from "react-icons/hi";
import Routes from "./pages/Routes.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const WHATSAPP_URL = "https://wa.me/+923041119786";

export default function App() {
  const [showScrollButton, setShowScrollButton] = useState(false);

  // useEffect(() => {
  //   console.log("🚀 App mounted. Setting up inactivity timer...");
  //   const INACTIVITY_LIMIT = 10 * 60 * 1000; // 7 minutes

  //   const resetTimer = () => {
  //     localStorage.setItem("lastActivity", Date.now().toString());
  //   };

  //   const checkInactivity = () => {
  //     const lastActivity = localStorage.getItem("lastActivity");

  //     if (!lastActivity) return;

  //     const timeElapsed = Date.now() - parseInt(lastActivity, 10);

  //     if (timeElapsed > INACTIVITY_LIMIT) {
  //       console.log("⏳ User inactive. Clearing session...");

  //       localStorage.clear(); // or remove specific keys
  //       window.location.href = "/"; // redirect to login
  //     }
  //   };

  //   // Set initial activity time on load
  //   resetTimer();

  //   // Activity listeners
  //   window.addEventListener("mousemove", resetTimer);
  //   window.addEventListener("keydown", resetTimer);
  //   window.addEventListener("click", resetTimer);
  //   window.addEventListener("scroll", resetTimer);

  //   // Check every minute
  //   const interval = setInterval(checkInactivity, 1000);

  //   return () => {
  //     window.removeEventListener("mousemove", resetTimer);
  //     window.removeEventListener("keydown", resetTimer);
  //     window.removeEventListener("click", resetTimer);
  //     window.removeEventListener("scroll", resetTimer);
  //     clearInterval(interval);
  //   };
  // }, []);

  useEffect(() => {
    const handleScrollVisibility = () => {
      setShowScrollButton(window.scrollY > 320);
    };

    handleScrollVisibility();
    window.addEventListener("scroll", handleScrollVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScrollVisibility);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Routes />
      {showScrollButton && (
        <button
          type="button"
          className="scroll-top-button"
          onClick={handleScrollToTop}
          aria-label="Go to top of page"
        >
          <HiArrowUp aria-hidden="true" />
        </button>
      )}
      <a
        href={WHATSAPP_URL}
        className="whatsapp-float-button"
        target="_blank"
        rel="noreferrer"
        aria-label="Open WhatsApp chat"
        title="Chat on WhatsApp"
      >
        <FaWhatsapp aria-hidden="true" />
      </a>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}
