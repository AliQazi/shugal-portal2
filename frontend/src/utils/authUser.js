export const getStoredFrontendUser = () => {
  try {
    return JSON.parse(localStorage.getItem("frontend_user") || "null");
  } catch {
    return null;
  }
};

export const getFrontendUserId = (user = getStoredFrontendUser()) => {
  if (!user) return null;

  if (typeof user === "string") return user;

  return (
    user._id || user.id || user.userId || user.user?._id || user.user?.id || null
  );
};

export const getFrontendUserName = (user = getStoredFrontendUser()) => {
  return (
    user?.name ||
    user?.companyName ||
    user?.user?.name ||
    user?.user?.companyName ||
    "User"
  );
};
