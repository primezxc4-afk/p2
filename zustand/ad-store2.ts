// import { create } from "zustand";
// import { persist } from "zustand/middleware";

// interface AdStore {
//   lastCooldownStart: number;
//   adsShown: number;
//   triggerAd: () => void;
// }

// export const useAdStore2 = create<AdStore>()(
//   persist(
//     (set, get) => ({
//       lastCooldownStart: 0,
//       adsShown: 0,

//       triggerAd: () => {
//         const now = Date.now();
//         const cooldown = 10 * 60 * 1000; // 10 min

//         const { lastCooldownStart, adsShown } = get();

//         // Cooldown active
//         if (lastCooldownStart > 0 && now - lastCooldownStart < cooldown) {
//           console.log("Cooldown active");
//           return;
//         }

//         // Cooldown finished -> reset cycle
//         if (lastCooldownStart > 0 && now - lastCooldownStart >= cooldown) {
//           set({
//             adsShown: 0,
//             lastCooldownStart: 0,
//           });
//         }

//         // Show ad
//         window.open(
//           "https://injusticebakery.com/m1n8h68e?key=a640607f30762b7dd7189c135c77afcd",
//           "_blank",
//         );

//         const newCount = get().adsShown + 1;

//         // After 2 ads, start cooldown
//         if (newCount >= 2) {
//           set({
//             adsShown: 0,
//             lastCooldownStart: now,
//           });
//         } else {
//           set({
//             adsShown: newCount,
//           });
//         }
//       },
//     }),
//     {
//       name: "ad-store2",
//       storage: {
//         getItem: (key) => {
//           const item = sessionStorage.getItem(key);
//           return item ? JSON.parse(item) : null;
//         },
//         setItem: (key, value) =>
//           sessionStorage.setItem(key, JSON.stringify(value)),
//         removeItem: (key) => sessionStorage.removeItem(key),
//       },
//     },
//   ),
// );
import { create } from "zustand";
import { persist } from "zustand/middleware";

const AD_URL =
  "https://injusticebakery.com/m1n8h68e?key=a640607f30762b7dd7189c135c77afcd";

interface AdStore {
  lastCooldownStart: number;
  adsShown: number;
  registerAd: () => void;
  triggerAd: () => void;
}

export const useAdStore2 = create<AdStore>()(
  persist(
    (set, get) => ({
      lastCooldownStart: 0,
      adsShown: 0,

      registerAd: () => {
        const now = Date.now();
        const newCount = get().adsShown + 1;

        if (newCount >= 2) {
          set({
            adsShown: 0,
            lastCooldownStart: now,
          });
        } else {
          set({
            adsShown: newCount,
          });
        }
      },

      triggerAd: () => {
        const now = Date.now();
        const cooldown = 10 * 60 * 1000;

        const { lastCooldownStart } = get();

        if (lastCooldownStart > 0 && now - lastCooldownStart < cooldown) {
          console.log("Cooldown active");
          return;
        }

        if (lastCooldownStart > 0 && now - lastCooldownStart >= cooldown) {
          set({
            adsShown: 0,
            lastCooldownStart: 0,
          });
        }

        window.open(AD_URL, "_blank");

        get().registerAd();
      },
    }),
    {
      name: "ad-store2",
      storage: {
        getItem: (key) => {
          const item = sessionStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        },
        setItem: (key, value) =>
          sessionStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
    },
  ),
);
