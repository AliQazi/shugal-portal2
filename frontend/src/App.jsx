import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { HiArrowUp } from "react-icons/hi";
import Routes from "./pages/Routes.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const WHATSAPP_URL = "https://wa.me/+923197298467";

export default function App() {
  const [showScrollButton, setShowScrollButton] = useState(false);

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
