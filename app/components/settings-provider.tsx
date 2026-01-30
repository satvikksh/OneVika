// "use client";

// import { createContext, useContext, useEffect, useState } from "react";

// type SettingsType = {
//   feed: {
//     enableBlinkScroll: boolean;
//     autoPlayVideos: boolean;
//     muteVideos: boolean;
//   };
//   updateFeedSettings: (key: string, value: boolean) => void;
// };

// const SettingsContext = createContext<SettingsType | undefined>(undefined);

// export function SettingsProvider({ children }: { children: React.ReactNode }) {
//   // Load from localStorage or default to true
//   const [feed, setFeed] = useState({
//     enableBlinkScroll: true,
//     autoPlayVideos: true,
//     muteVideos: false,
//   });

//   // Load saved settings on mount
//   useEffect(() => {
//     const saved = localStorage.getItem("neural-settings");
//     if (saved) {
//       try {
//         const parsed = JSON.parse(saved);
//         if (parsed.feed) setFeed(parsed.feed);
//       } catch (e) {
//         console.error("Failed to parse settings");
//       }
//     }
//   }, []);

//   const updateFeedSettings = (key: string, value: boolean) => {
//     setFeed((prev) => {
//       const newSettings = { ...prev, [key]: value };
//       // Save to localStorage immediately
//       localStorage.setItem("neural-settings", JSON.stringify({ feed: newSettings }));
//       return newSettings;
//     });
//   };

//   return (
//     <SettingsContext.Provider value={{ feed, updateFeedSettings }}>
//       {children}
//     </SettingsContext.Provider>
//   );
// }

// export const useSettings = () => {
//   const context = useContext(SettingsContext);
// //   if (!context) throw new Error("useSettings must be used within SettingsProvider");
//   return context;
// };