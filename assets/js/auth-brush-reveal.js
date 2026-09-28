(() => {
    'use strict';

    const screen = document.getElementById('screen-auth');
    const canvas = document.getElementById('auth-brush-canvas');
    if (!screen || !canvas) return;

    const ctx = canvas.getContext('2d');
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    const safeImage = new Image();
    const disasterImage = new Image();
    const brushImage = new Image();

    safeImage.src = 'assets/images/brush-reveal/safe-world.png';
    disasterImage.src = 'assets/images/brush-reveal/disaster-world.png';
    brushImage.src = 'assets/images/brush-reveal/brush-mask.png';

    let width = 1;
    let height = 1;
    let dpr = 1;
    let ready = false;
    let mouseX = 0;
    let mouseY = 0;
    let brushX = 0;
    let brushY = 0;
    let inside = false;

    // Increase this number to make the brush larger.
    const BRUSH_WIDTH = 1200;
    const FOLLOW_SPEED = 0.20;

    function resize() {
        const rect = screen.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        maskCanvas.width = Math.round(width * dpr);
        maskCanvas.height = Math.round(height * dpr);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (!inside) {
            brushX = width / 2;
            brushY = height / 2;
        }
    }

    function drawCover(context, image) {
        const iw = image.naturalWidth;
        const ih = image.naturalHeight;
        if (!iw || !ih) return;

        const scale = Math.max(width / iw, height / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const x = (width - dw) / 2;
        const y = (height - dh) / 2;
        context.drawImage(image, x, y, dw, dh);
    }

    function drawReveal() {
        maskCtx.clearRect(0, 0, width, height);

        const bw = brushImage.naturalWidth;
        const bh = brushImage.naturalHeight;
        const brushHeight = BRUSH_WIDTH * (bh / bw);

        maskCtx.drawImage(
            brushImage,
            brushX - BRUSH_WIDTH / 2,
            brushY - brushHeight / 2,
            BRUSH_WIDTH,
            brushHeight
        );

        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tempCtx = temp.getContext('2d');
        tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        drawCover(tempCtx, disasterImage);

        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(maskCanvas, 0, 0, width, height);
        tempCtx.globalCompositeOperation = 'source-over';

        ctx.drawImage(temp, 0, 0, width, height);
    }

    function render() {
        ctx.clearRect(0, 0, width, height);

        if (ready) {
            drawCover(ctx, safeImage);

            if (inside) {
                brushX += (mouseX - brushX) * FOLLOW_SPEED;
                brushY += (mouseY - brushY) * FOLLOW_SPEED;
                drawReveal();
            }
        }

        requestAnimationFrame(render);
    }

    function pointerMove(event) {
        const rect = screen.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
        inside = true;
    }

    screen.addEventListener('pointermove', pointerMove, { passive: true });
    screen.addEventListener('pointerenter', pointerMove, { passive: true });
    screen.addEventListener('pointerleave', () => { inside = false; }, { passive: true });

    function checkLoaded() {
        if (safeImage.complete && safeImage.naturalWidth &&
            disasterImage.complete && disasterImage.naturalWidth &&
            brushImage.complete && brushImage.naturalWidth) {
            resize();
            ready = true;
        }
    }

    safeImage.addEventListener('load', checkLoaded);
    disasterImage.addEventListener('load', checkLoaded);
    brushImage.addEventListener('load', checkLoaded);

    safeImage.addEventListener('error', () => console.error('[EduShield] Login safe image failed to load'));
    disasterImage.addEventListener('error', () => console.error('[EduShield] Login disaster image failed to load'));
    brushImage.addEventListener('error', () => console.error('[EduShield] Login brush image failed to load'));

    window.addEventListener('resize', resize, { passive: true });

    resize();
    render();
})();
