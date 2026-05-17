import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSurface, MobileNav, counselorNav, studentNav } from "@/components/admission/AppChrome";
import { getCurrentUser, isCounselorUser } from "@/components/admission/base44";
import "@/styles/toss-future-theme.css";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const onCounselorRoute = location.pathname.startsWith("/counselor");
  const navItems = onCounselorRoute || isCounselorUser(user) ? counselorNav : studentNav;

  return (
    <AppSurface>
      {children || <Outlet />}
      <MobileNav items={navItems} />
    </AppSurface>
  );
}
