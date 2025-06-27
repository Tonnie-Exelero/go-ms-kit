(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // ---------- SCROLL ---------- //
    const carousel = document.getElementById("carousel");
    const scrollLeftBtn = document.getElementById("scrollLeft");
    const scrollRightBtn = document.getElementById("scrollRight");

    const scrollAmount = 258; // Card width + gap

    scrollLeftBtn.addEventListener("click", function () {
      carousel.scrollBy({
        left: -scrollAmount,
        behavior: "smooth",
      });
    });

    scrollRightBtn.addEventListener("click", function () {
      carousel.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    });
    // ---------- END SCROLL ---------- //

    // ---------- SHUFFLE ---------- //
    // 1. Grab container and original card nodes
    const originalCards = Array.from(carousel.children);

    // 2. Shuffle utility
    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    // 3. Wire up Reset button
    document
      .querySelector(".footer__btn-left")
      .addEventListener("click", () => {
        // Clear & re‑append in original order
        carousel.innerHTML = "";
        originalCards.forEach((card) => carousel.appendChild(card));
      });

    // 4. Wire up Shuffle button
    document
      .querySelector(".footer__btn-right")
      .addEventListener("click", () => {
        const shuffled = originalCards.slice(); // copy
        shuffleArray(shuffled);
        carousel.innerHTML = "";
        shuffled.forEach((card) => carousel.appendChild(card));
      });
    // ---------- END SHUFFLE ---------- //
  });
})();
