    "use strict";

    (function () {
      const IMG = [
        "https://www.image2url.com/r2/default/files/1787833813616-15cef6ac-ea36-4f3d-a53b-3fa87bf28fc2.jpg",
      ];

      const DELAY_KEY = "popup_delay_1h";
      const SLIDER_INTERVAL = 7000;
      const STYLE_ID = "crb-popup-style";
      const POPUP_ID = "crb-popup";
      const OVERLAY_ID = "crb-popup-overlay";

      let popupCreated = false;
      let currentIndex = 0;
      let sliderTimer = null;
      let changingSlide = false;

      let marqueeFrame = null;
      let marqueeX = 0;
      let marqueeLastTime = 0;
      const MARQUEE_SPEED = 55;

      /* ==============================
         CEK HALAMAN
      ============================== */

      function isAllowedPage() {
        const path = location.pathname
          .replace(/\/+$/, "")
          .toLowerCase();

        return (
          path === "" ||
          path === "/" ||
          path.includes("home")
        );
      }

      function canShowPopup() {
        if (!isAllowedPage()) return false;

        const lastClosed = Number(
          localStorage.getItem(DELAY_KEY) || 0
        );

        return !(
          lastClosed &&
          Date.now() - lastClosed < 3600000
        );
      }

      /* ==============================
         PRELOAD SEMUA GAMBAR
      ============================== */

      function preloadImages() {
        return Promise.all(
          IMG.map(function (url) {
            return new Promise(function (resolve) {
              const preload = new Image();
              preload.decoding = "async";

              preload.onload = function () {
                if (typeof preload.decode === "function") {
                  preload
                    .decode()
                    .catch(function () {})
                    .finally(resolve);
                } else {
                  resolve();
                }
              };

              preload.onerror = resolve;
              preload.src = url;

              if (preload.complete && preload.naturalWidth > 0) {
                if (typeof preload.decode === "function") {
                  preload
                    .decode()
                    .catch(function () {})
                    .finally(resolve);
                } else {
                  resolve();
                }
              }
            });
          })
        );
      }

      /* ==============================
         CSS
      ============================== */

      function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
          @keyframes crbFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes crbFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }

          @keyframes crbSlideIn {
            from {
              transform: translateY(25px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes crbPopupPullUp {
            from {
              transform: translateY(0);
              opacity: 1;
            }
            to {
              transform: translateY(-110vh);
              opacity: 0;
            }
          }

          @keyframes crbShine {
            0% { left: -40%; }
            100% { left: 125%; }
          }

          #${OVERLAY_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            background:
              linear-gradient(
                180deg,
                rgba(0, 0, 0, .35),
                rgba(0, 0, 0, .82)
              );
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            animation: crbFadeIn .35s ease forwards;
          }

          #${OVERLAY_ID}.fade-out {
            animation: crbFadeOut .35s ease forwards;
          }

          #${POPUP_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 10px;
            padding: 12px;
            box-sizing: border-box;
            background: transparent;
            overflow-y: auto;
          }

          #${POPUP_ID}.pull-up {
            animation:
              crbPopupPullUp .72s
              cubic-bezier(.55, .05, .25, 1)
              forwards;
            pointer-events: none;
          }

          #crb-popup-box {
            position: relative;
            animation: crbSlideIn .45s ease forwards;
            filter: none !important;
            box-shadow: none !important;
            background: transparent !important;
            border: none !important;
          }

          #crb-close {
            position: absolute;
            top: -12px;
            right: -12px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background:
              linear-gradient(
                180deg,
                #d4af37,
                #6b4f00 60%,
                #111
              );
            color: #fff;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            border: 1px solid #f6d365;
            box-shadow:
              0 0 16px rgba(212, 175, 55, .7);
          }

          #crb-image-stage {
            position: relative;
            display: grid;
            place-items: center;
            max-width: 92vw;
            max-height: 58vh;
            overflow: hidden;
            background: transparent !important;
          }

          #crb-popup-img,
          #crb-popup-img-next {
            grid-area: 1 / 1;
            display: block;
            max-width: 92vw;
            max-height: 58vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 0;
            box-shadow: none !important;
            filter: none !important;
            background: transparent !important;
            border: none !important;
            will-change: transform, opacity;
          }

          #crb-popup-img {
            position: relative;
            z-index: 1;
            opacity: 1;
            transform: translateX(0);
          }

          #crb-popup-img-next {
            position: relative;
            z-index: 2;
            opacity: 0;
            transform: translateX(100%);
            pointer-events: none;
          }

          #crb-popup-img-next.slide-rtl {
            opacity: 1;
            transform: translateX(0);
            transition:
              transform .7s cubic-bezier(.22, .8, .28, 1),
              opacity .3s ease;
          }

          #crb-popup-img.slide-old-left {
            opacity: .28;
            transform: translateX(-18%);
            transition:
              transform .7s cubic-bezier(.22, .8, .28, 1),
              opacity .55s ease;
          }

          .crb-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 30px;
            border-radius: 50%;
            border: 1px solid #f6d365;
            background:
              linear-gradient(
                180deg,
                #b8860b,
                #3b2a00
              );
            color: #fff;
            font-size: 24px;
            font-weight: 900;
            cursor: pointer;
            z-index: 9998;
            line-height: 22px;
            box-shadow:
              0 0 14px rgba(212, 175, 55, .55);
          }

          #crb-prev {
            left: 8px;
          }

          #crb-next {
            right: 8px;
          }

          #crb-dots {
            position: absolute;
            left: 50%;
            bottom: 10px;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            z-index: 9998;
            padding: 5px 8px;
            border-radius: 20px;
            background: rgba(0, 0, 0, .25);
          }

          .crb-dot {
            width: 8px;
            height: 8px;
            min-width: 8px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, .5);
            padding: 0;
            cursor: pointer;
            transition:
              transform .2s ease,
              background .2s ease;
          }

          .crb-dot.active {
            background: #d4af37;
            transform: scale(1.3);
            box-shadow: 0 0 10px #d4af37;
          }

          /* ==============================
             RUNNING TEXT - RINGAN
          ============================== */
          #crb-title {
            width: 600px;
            max-width: 92vw;
            height: 30px;
            position: relative;
            display: flex;
            align-items: center;
            overflow: hidden;
            box-sizing: border-box;

            /* GOLD PREMIUM - disamakan dengan tombol */
            background:
              linear-gradient(
                180deg,
                #d4af37 0%,
                #a56b00 30%,
                #4a3200 70%,
                #111 100%
              );
            border: 1px solid #f6d365;
            border-radius: 8px;
            box-shadow:
              0 0 10px rgba(212, 175, 55, .65),
              0 0 22px rgba(212, 175, 55, .30),
              inset 0 1px 0 rgba(255, 255, 255, .18);
          }

          .crb-marquee-icon {
            width: 36px;
            min-width: 36px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
            font-size: 13px;
            color: #fff;
            background:
              linear-gradient(
                180deg,
                #d4af37 0%,
                #8c5a00 48%,
                #2d1d00 100%
              );
            border-right: 1px solid #f6d365;
            text-shadow: 0 1px 2px rgba(0, 0, 0, .7);
          }

          .crb-marquee-area {
            flex: 1;
            height: 100%;
            overflow: hidden;
            display: flex;
            align-items: center;
          }

          #crb-title-track {
            display: inline-block;
            flex: 0 0 auto;
            white-space: nowrap;
            font-weight: 800;
            font-size: 12px;
            color: #fff;
            letter-spacing: .3px;
            line-height: 26px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, .85);
            transform: translate3d(0, 0, 0);
            will-change: transform;
          }

          .crb-gif-row {
            display: flex;
            gap: 10px;
            justify-content: center;
            align-items: center;
          }

          .crb-gif-box {
            position: relative;
            width: 90px;
          }

          .crb-gif-box img {
            display: block;
            width: 100%;
            border-radius: 12px;
            pointer-events: none;
            box-shadow:
              0 0 10px rgba(212, 175, 55, .35);
          }

          .crb-btn-row {
            width: 310px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            justify-content: center;
            margin-top: 2px;
          }

          .crb-btn,
          .crb-ok {
            position: relative;
            overflow: hidden;
            cursor: pointer;
            text-align: center;
            font-weight: 900;
            color: #fff !important;
            transition:
              transform .18s ease,
              filter .18s ease;
          }

          .crb-btn {
            width: 148px;
            padding: 12px 0;
            border-radius: 15px;
            font-size: 12px;
            white-space: nowrap;
            text-decoration: none;
            letter-spacing: .5px;
            background:
              linear-gradient(
                180deg,
                #d4af37 0%,
                #a56b00 30%,
                #4a3200 70%,
                #111 100%
              );
            border: 1px solid #f6d365;
            box-shadow:
              0 0 12px rgba(212, 175, 55, .7),
              0 0 28px rgba(212, 175, 55, .38),
              0 9px 22px rgba(0, 0, 0, .55),
              inset 0 1px 0 rgba(255, 255, 255, .2);
          }

          .crb-ok {
            width: 120px;
            padding: 11px 0;
            border-radius: 14px;
            font-size: 14px;
            background:
              linear-gradient(
                180deg,
                #d4af37 0%,
                #a56b00 38%,
                #4a3200 75%,
                #111 100%
              );
            border: 1px solid #ffe08a;
            box-shadow:
              0 0 12px rgba(212, 175, 55, .8),
              0 0 25px rgba(212, 175, 55, .45),
              0 8px 20px rgba(0, 0, 0, .5),
              inset 0 1px 0 rgba(255, 255, 255, .2);
          }

          .crb-btn:hover,
          .crb-ok:hover {
            transform: scale(1.045);
            filter: brightness(1.18);
          }

          .crb-btn:active,
          .crb-ok:active {
            transform: scale(.96);
          }

          .crb-btn::before,
          .crb-ok::before {
            content: "";
            position: absolute;
            top: 0;
            left: -40%;
            width: 25%;
            height: 100%;
            background:
              linear-gradient(
                120deg,
                rgba(255, 255, 255, 0),
                rgba(255, 224, 138, .95),
                rgba(255, 255, 255, 0)
              );
            transform: skewX(-25deg);
            animation: crbShine 2s infinite;
          }

          @media (max-width: 768px) {
            #${POPUP_ID} {
              gap: 8px;
            }

            #crb-image-stage,
            #crb-popup-img,
            #crb-popup-img-next {
              max-width: 94vw;
              max-height: 55vh;
            }

            #crb-title {
              width: 92vw;
              height: 28px;
            }

            .crb-marquee-icon {
              width: 32px;
              min-width: 32px;
              font-size: 12px;
            }

            #crb-title-track {
              font-size: 11px;
              line-height: 24px;
            }

            .crb-gif-box {
              width: 78px;
            }

            .crb-btn-row {
              width: 310px;
              gap: 8px;
            }

            .crb-btn {
              width: 148px;
              font-size: 12px;
              padding: 11px 0;
            }

            .crb-ok {
              width: 115px;
              font-size: 13px;
              padding: 10px 0;
            }
          }
        `;

        document.head.appendChild(style);
      }

      /* ==============================
         BUAT POPUP
      ============================== */

      async function createPopup() {
        if (
          popupCreated ||
          !canShowPopup() ||
          !document.body
        ) {
          return;
        }

        popupCreated = true;
        injectStyle();

        await preloadImages();

        const overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;

        const popup = document.createElement("div");
        popup.id = POPUP_ID;

        popup.innerHTML = `
          <div id="crb-popup-box">

            <div id="crb-close" title="Tutup">
              ✕
            </div>

            <button
              type="button"
              class="crb-nav"
              id="crb-prev"
              aria-label="Gambar sebelumnya"
            >
              ‹
            </button>

            <div id="crb-image-stage">
              <img
                id="crb-popup-img"
                src="${IMG[0]}"
                alt="Dirgahayu Indonesia Slide 1"
              >

              <img
                id="crb-popup-img-next"
                src=""
                alt=""
                aria-hidden="true"
              >
            </div>

            <button
              type="button"
              class="crb-nav"
              id="crb-next"
              aria-label="Gambar berikutnya"
            >
              ›
            </button>

            <div id="crb-dots"></div>
          </div>

          <div id="crb-title">
            <div class="crb-marquee-icon">📢</div>
            <div class="crb-marquee-area">
              <div id="crb-title-track">
                Selamat Datang di Pasjackpot, DIRGAHAYU INDONESIA bermain bersama kami dan claim Bonusnya
              </div>
            </div>
          </div>

          <div class="crb-gif-row">

            <div class="crb-gif-box">
              <img
                src="https://media.tenor.com/ky4lyYmnHlsAAAAM/starlight-princess-slot-inces.gif"
                alt="Starlight Princess"
              >
            </div>

            <div class="crb-gif-box">
              <img
                src="https://imgcdn.it.com/hb8fdn9z3sk9b845yd0f/external-source/ms/mahjong-1.webp"
                alt="Mahjong Ways"
              >
            </div>

            <div class="crb-gif-box">
              <img
                src="https://imgcdn.it.com/knb2zump50st9c6kzrne/VIP_AI88/lucky_neko.webp"
                alt="Lucky Neko"
              >
            </div>

          </div>

          <div class="crb-btn-row">

            <a
              class="crb-btn"
              href="https://urlpsjshorten.com/lauravip"
              target="_blank"
              rel="noopener noreferrer"
            >
              VIP
            </a>

            <a
              class="crb-btn"
              href="https://urlpsjshorten.com/livechat-pasjackpot"
              target="_blank"
              rel="noopener noreferrer"
            >
              LiveChat
            </a>

            <button
              type="button"
              class="crb-ok"
              id="crb-ok"
            >
              OK
            </button>

          </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        const sliderImage =
          document.getElementById("crb-popup-img");

        const nextSliderImage =
          document.getElementById("crb-popup-img-next");

        const dotsContainer =
          document.getElementById("crb-dots");

        const marqueeArea =
          document.querySelector(".crb-marquee-area");

        const marqueeTrack =
          document.getElementById("crb-title-track");

        /* ==============================
           RUNNING TEXT - JS RINGAN
        ============================== */

        function startMarquee() {
          if (!marqueeArea || !marqueeTrack) return;

          if (marqueeFrame !== null) {
            cancelAnimationFrame(marqueeFrame);
          }

          marqueeX = marqueeArea.clientWidth;
          marqueeLastTime = performance.now();

          marqueeTrack.style.transform =
            "translate3d(" + marqueeX + "px,0,0)";

          function runMarquee(now) {
            const delta = Math.min(
              (now - marqueeLastTime) / 1000,
              0.05
            );

            marqueeLastTime = now;
            marqueeX -= MARQUEE_SPEED * delta;

            if (marqueeX <= -marqueeTrack.offsetWidth) {
              marqueeX = marqueeArea.clientWidth;
            }

            marqueeTrack.style.transform =
              "translate3d(" + marqueeX + "px,0,0)";

            marqueeFrame =
              requestAnimationFrame(runMarquee);
          }

          marqueeFrame =
            requestAnimationFrame(runMarquee);
        }

        function stopMarquee() {
          if (marqueeFrame !== null) {
            cancelAnimationFrame(marqueeFrame);
            marqueeFrame = null;
          }
        }

        /* ==============================
           DOT SLIDER
        ============================== */

        function renderDots() {
          dotsContainer.innerHTML = "";

          IMG.forEach(function (_, imageIndex) {
            const dot = document.createElement("button");

            dot.type = "button";
            dot.className =
              "crb-dot" +
              (imageIndex === currentIndex ? " active" : "");

            dot.setAttribute(
              "aria-label",
              "Tampilkan gambar " + (imageIndex + 1)
            );

            dot.addEventListener("click", function () {
              changeSlide(imageIndex);
              resetSliderTimer();
            });

            dotsContainer.appendChild(dot);
          });
        }

        /* ==============================
           SLIDE KANAN KE KIRI
        ============================== */

        function changeSlide(newIndex) {
          if (
            changingSlide ||
            newIndex < 0 ||
            newIndex >= IMG.length ||
            newIndex === currentIndex
          ) {
            return;
          }

          changingSlide = true;

          nextSliderImage.classList.remove("slide-rtl");
          sliderImage.classList.remove("slide-old-left");

          nextSliderImage.src = IMG[newIndex];
          nextSliderImage.alt =
            "Dirgahayu Indonesia Slide " + (newIndex + 1);

          nextSliderImage.style.transition = "none";
          nextSliderImage.style.opacity = "0";
          nextSliderImage.style.transform =
            "translateX(100%)";

          void nextSliderImage.offsetWidth;

          nextSliderImage.style.transition = "";
          nextSliderImage.style.opacity = "";
          nextSliderImage.style.transform = "";

          sliderImage.classList.add("slide-old-left");
          nextSliderImage.classList.add("slide-rtl");

          let finished = false;

          function finishSlide() {
            if (finished) return;
            finished = true;

            nextSliderImage.removeEventListener(
              "transitionend",
              handleTransitionEnd
            );

            currentIndex = newIndex;

            sliderImage.src = IMG[currentIndex];
            sliderImage.alt =
              "Dirgahayu Indonesia Slide " +
              (currentIndex + 1);

            sliderImage.classList.remove("slide-old-left");
            sliderImage.style.transition = "none";
            sliderImage.style.opacity = "1";
            sliderImage.style.transform = "translateX(0)";

            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                nextSliderImage.style.transition = "none";
                nextSliderImage.classList.remove("slide-rtl");
                nextSliderImage.style.opacity = "0";
                nextSliderImage.style.transform =
                  "translateX(100%)";
                nextSliderImage.src = "";
                nextSliderImage.alt = "";

                requestAnimationFrame(function () {
                  sliderImage.style.transition = "";
                  sliderImage.style.opacity = "";
                  sliderImage.style.transform = "";

                  nextSliderImage.style.transition = "";
                  nextSliderImage.style.opacity = "";
                  nextSliderImage.style.transform = "";

                  changingSlide = false;
                });
              });
            });

            renderDots();
          }

          function handleTransitionEnd(event) {
            if (
              event.target === nextSliderImage &&
              event.propertyName === "transform"
            ) {
              finishSlide();
            }
          }

          nextSliderImage.addEventListener(
            "transitionend",
            handleTransitionEnd
          );

          window.setTimeout(finishSlide, 900);
        }

        function nextSlide() {
          const nextIndex =
            (currentIndex + 1) % IMG.length;

          changeSlide(nextIndex);
        }

        function previousSlide() {
          const previousIndex =
            (currentIndex - 1 + IMG.length) % IMG.length;

          changeSlide(previousIndex);
        }

        function startSliderTimer() {
          clearInterval(sliderTimer);

          sliderTimer = setInterval(function () {
            nextSlide();
          }, SLIDER_INTERVAL);
        }

        function resetSliderTimer() {
          startSliderTimer();
        }

        /* ==============================
           TUTUP POPUP
        ============================== */

        function closePopup() {
          clearInterval(sliderTimer);
          stopMarquee();

          popup.classList.add("pull-up");
          overlay.classList.add("fade-out");

          localStorage.setItem(
            DELAY_KEY,
            String(Date.now())
          );

          setTimeout(function () {
            popup.remove();
            overlay.remove();
            popupCreated = false;
          }, 760);
        }

        /* ==============================
           EVENT
        ============================== */

        document
          .getElementById("crb-next")
          .addEventListener("click", function () {
            nextSlide();
            resetSliderTimer();
          });

        document
          .getElementById("crb-prev")
          .addEventListener("click", function () {
            previousSlide();
            resetSliderTimer();
          });

        document
          .getElementById("crb-close")
          .addEventListener("click", closePopup);

        document
          .getElementById("crb-ok")
          .addEventListener("click", closePopup);

        renderDots();
        startSliderTimer();

        requestAnimationFrame(function () {
          requestAnimationFrame(startMarquee);
        });
      }

      /* ==============================
         INIT
      ============================== */

      function init() {
        let retry = 0;

        const checkBody = setInterval(function () {
          createPopup();
          retry++;

          if (popupCreated || retry >= 40) {
            clearInterval(checkBody);
          }
        }, 500);
      }

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          init,
          { once: true }
        );
      } else {
        init();
      }
    })();
