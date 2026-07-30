import { useEffect, useRef, useState } from "react";
import { CiMenuFries } from "react-icons/ci";
import { AiOutlineClose } from "react-icons/ai";
import { groupTypes } from "../../data/groupTypes";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import OldHeader from "./OldHeader";

export default function Header({ user, handleLogout }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasToken, setHasToken] = useState(() => {
    return !!localStorage.getItem("frontend_token");
  });

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("frontend_token");
      setHasToken(!!token);
    };

    checkToken();

    window.addEventListener("storage", checkToken);

    return () => {
      window.removeEventListener("storage", checkToken);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileOpen || !profileRef.current) return;
      if (!profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const activeGroupTypes = searchParams
    .getAll("group_type")
    .map((g) => g.toLowerCase().trim());

  if (hasToken) {
    return (
      <>
        <OldHeader user={user} handleLogout={handleLogout} />
      </>
    );
  }
}
