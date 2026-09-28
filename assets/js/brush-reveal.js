(function () {

    "use strict";

    const canvas = document.getElementById("dashboard-brush-canvas");

    if (!canvas) {
        console.error("Dashboard brush canvas not found.");
        return;
    }

    const ctx = canvas.getContext("2d");

    const safeImage = new Image();
    const disasterImage = new Image();
    const brushImage = new Image();

    /*
     * CHANGE THESE ONLY IF YOUR FILE NAMES ARE DIFFERENT
     */
    safeImage.src = "assets/images/brush-reveal/safe-world.png";
    disasterImage.src = "assets/images/brush-reveal/disaster-world.png";
    brushImage.src = "assets/images/brush-reveal/brush-mask.png";


    /* ==========================================
       SETTINGS
       ========================================== */

    const BRUSH_SIZE = 1500;
    const SMOOTHNESS = 0.20;


    /* ==========================================
       VARIABLES
       ========================================== */

    let mouseX = -1000;
    let mouseY = -1000;

    let currentX = -1000;
    let currentY = -1000;

    let width = window.innerWidth;
    let height = window.innerHeight;

    let imagesReady = false;


    /* ==========================================
       RESIZE
       ========================================== */

    function resize() {

        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = width;
        canvas.height = height;

        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
    }


    window.addEventListener("resize", resize);

    resize();


    /* ==========================================
       COVER IMAGE
       ========================================== */

    function drawCover(context, image) {

        if (!image.naturalWidth) return;

        const imageWidth = image.naturalWidth;
        const imageHeight = image.naturalHeight;

        const scale = Math.max(
            width / imageWidth,
            height / imageHeight
        );

        const drawWidth = imageWidth * scale;
        const drawHeight = imageHeight * scale;

        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        context.drawImage(
            image,
            x,
            y,
            drawWidth,
            drawHeight
        );
    }


    /* ==========================================
       MOUSE
       ========================================== */

    document.addEventListener(
        "mousemove",
        function (event) {

            mouseX = event.clientX;
            mouseY = event.clientY;

        },
        { passive: true }
    );


    /* ==========================================
       CHECK DASHBOARD
       ========================================== */

    function isDashboardVisible() {

        const dashboard =
            document.getElementById("screen-dashboard");

        if (!dashboard) return false;

        const style =
            window.getComputedStyle(dashboard);

        return (
            dashboard.classList.contains("active") &&
            style.display !== "none" &&
            style.visibility !== "hidden"
        );
    }


    /* ==========================================
       CHECK IMAGES
       ========================================== */

    function checkImages() {

        if (
            safeImage.complete &&
            disasterImage.complete &&
            brushImage.complete &&
            safeImage.naturalWidth > 0 &&
            disasterImage.naturalWidth > 0 &&
            brushImage.naturalWidth > 0
        ) {

            imagesReady = true;

            console.log(
                "EduShield dashboard brush images loaded."
            );
        }
    }


    safeImage.onload = checkImages;
    disasterImage.onload = checkImages;
    brushImage.onload = checkImages;


    safeImage.onerror = function () {
        console.error(
            "Cannot load brush-reveal/safe-world.png"
        );
    };


    disasterImage.onerror = function () {
        console.error(
            "Cannot load brush-reveal/disaster-world.png"
        );
    };


    brushImage.onerror = function () {
        console.error(
            "Cannot load brush-reveal/brush-mask.png"
        );
    };


    /* ==========================================
       DRAW DASHBOARD
       ========================================== */

    function draw() {

        /*
         * Hide canvas when dashboard isn't active.
         */

        if (!isDashboardVisible()) {

            canvas.style.display = "none";

            requestAnimationFrame(draw);

            return;
        }


        canvas.style.display = "block";


        /*
         * If images aren't loaded yet,
         * don't draw anything.
         */

        if (!imagesReady) {

            requestAnimationFrame(draw);

            return;
        }


        /*
         * Smooth brush movement
         */

        currentX +=
            (mouseX - currentX) * SMOOTHNESS;

        currentY +=
            (mouseY - currentY) * SMOOTHNESS;


        /*
         * --------------------------------------
         * STEP 1
         * SAFE BACKGROUND
         * --------------------------------------
         */

        ctx.globalCompositeOperation =
            "source-over";

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        drawCover(
            ctx,
            safeImage
        );


        /*
         * --------------------------------------
         * STEP 2
         * CREATE DISASTER LAYER
         * --------------------------------------
         */

        const revealCanvas =
            document.createElement("canvas");

        revealCanvas.width = width;
        revealCanvas.height = height;

        const revealCtx =
            revealCanvas.getContext("2d");


        drawCover(
            revealCtx,
            disasterImage
        );


        /*
         * --------------------------------------
         * STEP 3
         * BRUSH MASK
         * --------------------------------------
         */

        revealCtx.globalCompositeOperation =
            "destination-in";


        const brushWidth =
            BRUSH_SIZE;


        const brushHeight =
            BRUSH_SIZE *
            (
                brushImage.naturalHeight /
                brushImage.naturalWidth
            );


        revealCtx.drawImage(

            brushImage,

            currentX -
                brushWidth / 2,

            currentY -
                brushHeight / 2,

            brushWidth,

            brushHeight
        );


        /*
         * --------------------------------------
         * STEP 4
         * PUT REVEALED DISASTER OVER SAFE
         * --------------------------------------
         */

        ctx.globalCompositeOperation =
            "source-over";


        ctx.drawImage(
            revealCanvas,
            0,
            0
        );


        requestAnimationFrame(draw);
    }


    draw();


})();