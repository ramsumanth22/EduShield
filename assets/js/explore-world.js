/* ============================================================
   EduShield - Explore World
   Modern Mini-City Edition

   Theme:
   #050505  Black
   #172D59  Deep Navy
   #52698F  Slate Blue
   #5599D3  Sky Blue
   #A6A6A6  Cool Gray
   #F2F4F7  White

   Keeps:
   - WASD movement
   - Mouse look / pointer lock
   - Earthquake Learning Zone
   - Tsunami Learning Zone
   - launchJourney('earthquake')
   ============================================================ */

(function () {

    let ewScene;
    let ewCamera;
    let ewRenderer;
    let ewAnimationId = null;

    let ewStarted = false;
    let ewPromptOpen = false;
    let ewPointerLocked = false;
    let ewWorldActive = false;

    let ewYaw = 0;
    let ewPitch = 0;

    let ewNearBuilding = false;
    let ewNearBeach = false;

    const ewKeys = {};
    const ewClock = new THREE.Clock();
    const ewTextureLoader = new THREE.TextureLoader();

    // ============================================================
    // CITY PALETTE
    // ============================================================

    const C = {
        BLACK: 0x050505,
        NAVY: 0x172D59,
        SLATE: 0x52698F,
        BLUE: 0x5599D3,
        GRAY: 0xA6A6A6,
        WHITE: 0xF2F4F7,

        DARK_BLUE: 0x203D72,
        GLASS: 0x4D8FCA,
        ROAD: 0x11151B,
        SIDEWALK: 0x687386,

        GRASS: 0x455D50,
        PARK: 0x536D59,

        WINDOW: 0x91C8EE,
        DARK_WINDOW: 0x1D355C,

        WARNING: 0xFFB84D,
        RED: 0xEF5350
    };

    // ============================================================
    // USER ASSETS
    // ============================================================

    const ASSETS = {
        tree: 'assets/models/user-assets/tree.png',
        building: 'assets/models/user-assets/building.png',
        car: 'assets/models/user-assets/car.png'
    };

    // Earthquake landmark
    const buildingPos = new THREE.Vector3(-24, 0, -38);

    // Coast
    const beachZ = -170;


    // ============================================================
    // BASIC HELPERS
    // ============================================================

    function addBox(
        x,
        y,
        z,
        width,
        height,
        depth,
        color,
        roughness = 0.8,
        metalness = 0.05
    ) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                height,
                depth
            ),
            new THREE.MeshStandardMaterial({
                color: color,
                roughness: roughness,
                metalness: metalness
            })
        );

        mesh.position.set(
            x,
            y + height / 2,
            z
        );

        ewScene.add(mesh);

        return mesh;
    }


    function addCylinder(
        x,
        y,
        z,
        radius,
        height,
        color
    ) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
                radius,
                radius,
                height,
                12
            ),
            new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.75
            })
        );

        mesh.position.set(
            x,
            y + height / 2,
            z
        );

        ewScene.add(mesh);

        return mesh;
    }


    function loadTexture(path) {
        const texture = ewTextureLoader.load(path);

        if (THREE.SRGBColorSpace) {
            texture.colorSpace =
                THREE.SRGBColorSpace;
        }

        if (ewRenderer) {
            texture.anisotropy = Math.min(
                4,
                ewRenderer.capabilities
                    .getMaxAnisotropy()
            );
        }

        return texture;
    }


    // ============================================================
    // IMAGE CUTOUT
    // ============================================================

    function makeCutout(
        texture,
        x,
        y,
        z,
        width,
        height,
        rotation = 0,
        crossed = true
    ) {
        const group = new THREE.Group();

        group.position.set(x, y, z);
        group.rotation.y = rotation;

        const material =
            new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.08,
                side: THREE.DoubleSide,
                depthWrite: true,
                roughness: 1
            });

        const plane1 = new THREE.Mesh(
            new THREE.PlaneGeometry(
                width,
                height
            ),
            material
        );

        plane1.position.y =
            height / 2;

        group.add(plane1);

        if (crossed) {

            const plane2 = new THREE.Mesh(
                new THREE.PlaneGeometry(
                    width,
                    height
                ),
                material.clone()
            );

            plane2.position.y =
                height / 2;

            plane2.rotation.y =
                Math.PI / 2;

            group.add(plane2);
        }

        ewScene.add(group);

        return group;
    }


    // ============================================================
    // VARIED TREES
    // ============================================================

    function makeProceduralTree(
        x,
        z,
        scale = 1,
        variant = 0
    ) {
        const group =
            new THREE.Group();

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(
                0.18 * scale,
                0.27 * scale,
                2.1 * scale,
                7
            ),
            new THREE.MeshStandardMaterial({
                color: 0x4A4038,
                roughness: 1
            })
        );

        trunk.position.y =
            1.05 * scale;

        group.add(trunk);

        const foliageColors = [
            0x304F49,
            0x3D5E4D,
            0x536D59,
            0x2E4547
        ];

        const foliageColor =
            foliageColors[
                variant %
                foliageColors.length
            ];

        if (variant % 3 === 0) {

            for (let i = 0; i < 3; i++) {

                const crown =
                    new THREE.Mesh(
                        new THREE.SphereGeometry(
                            1.25 * scale,
                            8,
                            6
                        ),
                        new THREE.MeshStandardMaterial({
                            color: foliageColor,
                            roughness: 1
                        })
                    );

                crown.position.set(
                    (i - 1) *
                        0.75 *
                        scale,
                    (2.1 +
                        (i % 2) *
                        0.5) *
                        scale,
                    (i % 2) *
                        0.3 *
                        scale
                );

                group.add(crown);
            }

        } else if (variant % 3 === 1) {

            const crown =
                new THREE.Mesh(
                    new THREE.ConeGeometry(
                        1.4 * scale,
                        3.3 * scale,
                        8
                    ),
                    new THREE.MeshStandardMaterial({
                        color: foliageColor,
                        roughness: 1
                    })
                );

            crown.position.y =
                3 * scale;

            group.add(crown);

        } else {

            for (let i = 0; i < 4; i++) {

                const crown =
                    new THREE.Mesh(
                        new THREE.SphereGeometry(
                            0.95 * scale,
                            7,
                            5
                        ),
                        new THREE.MeshStandardMaterial({
                            color: foliageColor,
                            roughness: 1
                        })
                    );

                crown.position.set(
                    (Math.random() - 0.5) *
                        1.7 *
                        scale,
                    (2.2 +
                        Math.random() *
                        1.3) *
                        scale,
                    (Math.random() - 0.5) *
                        1.7 *
                        scale
                );

                group.add(crown);
            }
        }

        group.position.set(
            x,
            0,
            z
        );

        ewScene.add(group);

        return group;
    }


    function makeTree(
        x,
        z,
        scale = 1,
        variant = 0
    ) {
        // Every fourth tree uses your original supplied image.
        if (variant % 4 === 0) {

            try {

                const texture =
                    loadTexture(
                        ASSETS.tree
                    );

                return makeCutout(
                    texture,
                    x,
                    0,
                    z,
                    7.5 * scale,
                    9 * scale,
                    variant * 0.3,
                    true
                );

            } catch (error) {
                return makeProceduralTree(
                    x,
                    z,
                    scale,
                    variant
                );
            }
        }

        return makeProceduralTree(
            x,
            z,
            scale,
            variant
        );
    }


    // ============================================================
    // WINDOWS
    // ============================================================

    function addWindows(
        x,
        z,
        width,
        height,
        depth,
        floors,
        columns
    ) {
        const floorHeight =
            height / floors;

        const columnWidth =
            width / columns;

        for (
            let floor = 0;
            floor < floors;
            floor++
        ) {

            for (
                let column = 0;
                column < columns;
                column++
            ) {

                const window =
                    new THREE.Mesh(
                        new THREE.PlaneGeometry(
                            Math.min(
                                0.9,
                                columnWidth * 0.55
                            ),
                            Math.min(
                                1.05,
                                floorHeight * 0.48
                            )
                        ),
                        new THREE.MeshStandardMaterial({
                            color: C.WINDOW,
                            emissive: C.WINDOW,
                            emissiveIntensity: 0.08,
                            roughness: 0.4,
                            metalness: 0.2
                        })
                    );

                window.position.set(
                    x -
                        width / 2 +
                        columnWidth *
                            (column + 0.5),

                    0.6 +
                        floorHeight *
                            (floor + 0.5),

                    z +
                        depth / 2 +
                        0.02
                );

                ewScene.add(window);
            }
        }
    }


    // ============================================================
    // VARIED BUILDINGS
    // ============================================================

    function makeOffice(
        x,
        z,
        width,
        height,
        depth,
        color,
        accent
    ) {
        addBox(
            x,
            0,
            z,
            width,
            height,
            depth,
            color,
            0.55,
            0.15
        );

        addWindows(
            x,
            z,
            width - 1,
            height - 1,
            depth,
            Math.max(
                2,
                Math.floor(
                    height / 3
                )
            ),
            Math.max(
                2,
                Math.floor(
                    width / 2
                )
            )
        );

        // Roof
        addBox(
            x,
            height,
            z,
            width + 0.3,
            0.35,
            depth + 0.3,
            accent,
            0.5,
            0.2
        );

        // Entrance
        addBox(
            x,
            0,
            z +
                depth / 2 +
                0.35,
            Math.min(
                3.8,
                width * 0.35
            ),
            2.4,
            0.5,
            C.GRAY
        );

        addBox(
            x,
            0.6,
            z +
                depth / 2 +
                0.63,
            2.2,
            1.1,
            0.05,
            C.BLUE,
            0.25,
            0.4
        );
    }


    function makeTower(
        x,
        z,
        width,
        height,
        depth,
        color
    ) {
        addBox(
            x,
            0,
            z,
            width,
            height,
            depth,
            color,
            0.45,
            0.25
        );

        // Glass vertical sections
        for (
            let i = -1;
            i <= 1;
            i++
        ) {

            addBox(
                x +
                    i *
                    width *
                    0.28,

                0.5,
                z +
                    depth / 2 +
                    0.02,

                width * 0.07,
                height - 1,
                0.05,

                C.BLUE,
                0.25,
                0.45
            );
        }

        addWindows(
            x,
            z,
            width - 0.8,
            height - 1,
            depth,
            Math.max(
                5,
                Math.floor(
                    height / 2.5
                )
            ),
            Math.max(
                2,
                Math.floor(
                    width / 2
                )
            )
        );

        // Crown
        addBox(
            x,
            height,
            z,
            width * 0.7,
            1.2,
            depth * 0.7,
            C.SLATE
        );

        // Antenna
        addCylinder(
            x,
            height + 1.2,
            z,
            0.08,
            4,
            C.GRAY
        );
    }


    function makeResidential(
        x,
        z,
        variant = 0
    ) {
        const options = [
            {
                width: 9,
                height: 9,
                depth: 8,
                color: C.GRAY
            },
            {
                width: 12,
                height: 7,
                depth: 9,
                color: C.SLATE
            },
            {
                width: 8,
                height: 12,
                depth: 8,
                color: C.NAVY
            }
        ];

        const b =
            options[
                variant %
                options.length
            ];

        makeOffice(
            x,
            z,
            b.width,
            b.height,
            b.depth,
            b.color,
            variant % 2
                ? C.BLUE
                : C.GRAY
        );
    }


    function makeShop(
        x,
        z,
        color = C.NAVY
    ) {
        addBox(
            x,
            0,
            z,
            10,
            5.5,
            8,
            color
        );

        addBox(
            x,
            5.5,
            z,
            10.2,
            0.4,
            8.2,
            C.GRAY
        );

        // Glass storefront
        addBox(
            x,
            0.9,
            z + 4.06,
            7.2,
            2.2,
            0.08,
            C.BLUE,
            0.25,
            0.35
        );

        // Sign
        addBox(
            x,
            4.2,
            z + 4.15,
            6.8,
            0.65,
            0.1,
            C.WHITE
        );
    }


    // ============================================================
    // SPECIAL BUILDINGS
    // ============================================================

    function makeSchool(x, z) {

        addBox(
            x,
            0,
            z,
            18,
            7,
            12,
            C.GRAY
        );

        addBox(
            x,
            7,
            z,
            18.4,
            0.5,
            12.4,
            C.NAVY
        );

        addBox(
            x,
            0,
            z + 6.1,
            5.5,
            6,
            1,
            C.DARK_BLUE
        );

        for (
            let floor = 0;
            floor < 2;
            floor++
        ) {

            for (
                let col = -3;
                col <= 3;
                col++
            ) {

                addBox(
                    x + col * 2.1,
                    1.5 +
                        floor * 2.3,
                    z + 6.08,
                    1.1,
                    1.2,
                    0.08,
                    C.WINDOW
                );
            }
        }

        addLocationLabel(
            'SCHOOL',
            x,
            9,
            z + 6,
            C.BLUE
        );
    }


    function makeHospital(x, z) {

        addBox(
            x,
            0,
            z,
            17,
            9,
            13,
            C.WHITE
        );

        addBox(
            x,
            0,
            z + 6.6,
            17.2,
            0.45,
            13.2,
            C.BLUE
        );

        // Medical cross
        addBox(
            x,
            5.7,
            z + 7,
            2.2,
            0.55,
            0.15,
            C.RED
        );

        addBox(
            x,
            5.7,
            z + 7,
            0.55,
            2.2,
            0.15,
            C.RED
        );

        addLocationLabel(
            'HOSPITAL',
            x,
            11,
            z + 7,
            C.RED
        );
    }


    function makeFireStation(x, z) {

        addBox(
            x,
            0,
            z,
            14,
            6,
            10,
            C.NAVY
        );

        addBox(
            x,
            5.8,
            z,
            14.2,
            0.45,
            10.2,
            C.RED
        );

        for (
            let i = -1;
            i <= 1;
            i++
        ) {

            addBox(
                x + i * 4,
                0.2,
                z + 5.1,
                3,
                4.1,
                0.25,
                C.BLACK
            );
        }

        addLocationLabel(
            'FIRE STATION',
            x,
            8,
            z + 5,
            C.RED
        );
    }


    // ============================================================
    // CARS
    // ============================================================

    function makeCar(
        x,
        z,
        rotation = 0,
        scale = 1,
        variant = 0
    ) {
        const group =
            new THREE.Group();

        const carColors = [
            C.NAVY,
            C.BLACK,
            C.GRAY,
            C.BLUE,
            0x34445F,
            0xD4D7DC
        ];

        const bodyColor =
            carColors[
                variant %
                carColors.length
            ];

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    3.2 * scale,
                    0.8 * scale,
                    1.55 * scale
                ),
                new THREE.MeshStandardMaterial({
                    color: bodyColor,
                    roughness: 0.55,
                    metalness: 0.25
                })
            );

        body.position.y =
            0.8 * scale;

        group.add(body);

        const roof =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.7 * scale,
                    0.65 * scale,
                    1.25 * scale
                ),
                new THREE.MeshStandardMaterial({
                    color:
                        variant % 3 === 0
                            ? C.GRAY
                            : bodyColor,
                    roughness: 0.45,
                    metalness: 0.2
                })
            );

        roof.position.y =
            1.45 * scale;

        group.add(roof);

        const glass =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.1 * scale,
                    0.4 * scale,
                    1.28 * scale
                ),
                new THREE.MeshStandardMaterial({
                    color: C.DARK_WINDOW,
                    roughness: 0.25,
                    metalness: 0.35
                })
            );

        glass.position.set(
            0.35 * scale,
            1.46 * scale,
            0
        );

        group.add(glass);

        const wheelMaterial =
            new THREE.MeshStandardMaterial({
                color: C.BLACK,
                roughness: 0.95
            });

        [-1.05, 1.05].forEach(px => {

            [-0.75, 0.75].forEach(pz => {

                const wheel =
                    new THREE.Mesh(
                        new THREE.CylinderGeometry(
                            0.38 * scale,
                            0.38 * scale,
                            0.25 * scale,
                            12
                        ),
                        wheelMaterial
                    );

                wheel.rotation.z =
                    Math.PI / 2;

                wheel.position.set(
                    px * scale,
                    0.42 * scale,
                    pz * scale
                );

                group.add(wheel);
            });
        });

        group.position.set(
            x,
            0,
            z
        );

        group.rotation.y =
            rotation;

        ewScene.add(group);

        return group;
    }


    function makeBus(
        x,
        z,
        rotation = 0
    ) {
        const group =
            new THREE.Group();

        const body =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    8.5,
                    3.2,
                    2.3
                ),
                new THREE.MeshStandardMaterial({
                    color: C.DARK_BLUE,
                    roughness: 0.55,
                    metalness: 0.2
                })
            );

        body.position.y =
            1.6;

        group.add(body);

        const windows =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    7.2,
                    1.15,
                    2.38
                ),
                new THREE.MeshStandardMaterial({
                    color: C.BLUE,
                    roughness: 0.25,
                    metalness: 0.3
                })
            );

        windows.position.y =
            2.1;

        group.add(windows);

        group.position.set(
            x,
            0,
            z
        );

        group.rotation.y =
            rotation;

        ewScene.add(group);
    }


    // ============================================================
    // STREET LIGHTS
    // ============================================================

    function makeStreetLight(
        x,
        z,
        rotation = 0
    ) {
        const group =
            new THREE.Group();

        const pole =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.08,
                    0.12,
                    5.2,
                    8
                ),
                new THREE.MeshStandardMaterial({
                    color: C.GRAY,
                    metalness: 0.65,
                    roughness: 0.4
                })
            );

        pole.position.y =
            2.6;

        group.add(pole);

        const arm =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    1.1,
                    0.08,
                    0.08
                ),
                new THREE.MeshStandardMaterial({
                    color: C.GRAY,
                    metalness: 0.6
                })
            );

        arm.position.set(
            0.48,
            5.05,
            0
        );

        group.add(arm);

        const lamp =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.32,
                    0.18,
                    0.28
                ),
                new THREE.MeshStandardMaterial({
                    color: C.WHITE,
                    emissive: C.WHITE,
                    emissiveIntensity: 0.4
                })
            );

        lamp.position.set(
            1,
            4.96,
            0
        );

        group.add(lamp);

        group.position.set(
            x,
            0,
            z
        );

        group.rotation.y =
            rotation;

        ewScene.add(group);
    }


    // ============================================================
    // TRAFFIC LIGHT
    // ============================================================

    function makeTrafficLight(
        x,
        z,
        rotation = 0
    ) {
        const group =
            new THREE.Group();

        const pole =
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.08,
                    0.11,
                    4.5,
                    8
                ),
                new THREE.MeshStandardMaterial({
                    color: C.BLACK
                })
            );

        pole.position.y =
            2.25;

        group.add(pole);

        const housing =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.55,
                    1.65,
                    0.45
                ),
                new THREE.MeshStandardMaterial({
                    color: C.BLACK
                })
            );

        housing.position.y =
            4.05;

        group.add(housing);

        const lights = [
            C.RED,
            C.WARNING,
            C.BLUE
        ];

        lights.forEach(
            (color, index) => {

                const lamp =
                    new THREE.Mesh(
                        new THREE.SphereGeometry(
                            0.14,
                            10,
                            8
                        ),
                        new THREE.MeshStandardMaterial({
                            color: color,
                            emissive: color,
                            emissiveIntensity: 0.45
                        })
                    );

                lamp.position.set(
                    0,
                    4.55 -
                        index * 0.48,
                    0.24
                );

                group.add(lamp);
            }
        );

        group.position.set(
            x,
            0,
            z
        );

        group.rotation.y =
            rotation;

        ewScene.add(group);
    }


    // ============================================================
    // PARK
    // ============================================================

    function makeBench(
        x,
        z,
        rotation = 0
    ) {
        const group =
            new THREE.Group();

        const seat =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    2.6,
                    0.18,
                    0.65
                ),
                new THREE.MeshStandardMaterial({
                    color: C.NAVY
                })
            );

        seat.position.y =
            1.05;

        group.add(seat);

        const back =
            new THREE.Mesh(
                new THREE.BoxGeometry(
                    2.6,
                    0.85,
                    0.16
                ),
                new THREE.MeshStandardMaterial({
                    color: C.NAVY
                })
            );

        back.position.set(
            0,
            1.45,
            -0.25
        );

        group.add(back);

        [-0.9, 0.9].forEach(
            px => {

                const leg =
                    new THREE.Mesh(
                        new THREE.BoxGeometry(
                            0.14,
                            1,
                            0.4
                        ),
                        new THREE.MeshStandardMaterial({
                            color: C.GRAY,
                            metalness: 0.45
                        })
                    );

                leg.position.set(
                    px,
                    0.5,
                    0
                );

                group.add(leg);
            }
        );

        group.position.set(
            x,
            0,
            z
        );

        group.rotation.y =
            rotation;

        ewScene.add(group);
    }


    function makePark(
        x,
        z,
        width,
        depth
    ) {
        addBox(
            x,
            0,
            z,
            width,
            0.08,
            depth,
            C.PARK
        );

        addBox(
            x,
            0.05,
            z,
            width * 0.08,
            0.05,
            depth,
            C.GRAY
        );

        addBox(
            x,
            0.05,
            z,
            width,
            0.05,
            depth * 0.08,
            C.GRAY
        );

        const positions = [
            [-width * 0.35, -depth * 0.3],
            [width * 0.35, -depth * 0.28],
            [-width * 0.32, depth * 0.32],
            [width * 0.32, depth * 0.3]
        ];

        positions.forEach(
            (p, i) => {

                makeTree(
                    x + p[0],
                    z + p[1],
                    0.65 +
                        (i % 2) *
                        0.12,
                    i + 1
                );
            }
        );

        makeBench(
            x - width * 0.2,
            z,
            Math.PI / 2
        );

        makeBench(
            x + width * 0.2,
            z,
            -Math.PI / 2
        );
    }


    // ============================================================
    // CLOUDS
    // ============================================================

    function makeCloud(
        x,
        y,
        z,
        scale = 1
    ) {
        const group =
            new THREE.Group();

        const material =
            new THREE.MeshLambertMaterial({
                color: C.WHITE
            });

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            const puff =
                new THREE.Mesh(
                    new THREE.SphereGeometry(
                        2.4,
                        8,
                        6
                    ),
                    material
                );

            puff.position.set(
                i * 2.2,
                (i % 2) * 0.6,
                (i % 3) * 0.25
            );

            group.add(puff);
        }

        group.position.set(
            x,
            y,
            z
        );

        group.scale.setScalar(
            scale
        );

        ewScene.add(group);
    }


    // ============================================================
    // LOCATION LABEL
    // ============================================================

    function addLocationLabel(
        text,
        x,
        y,
        z,
        color
    ) {
        const canvas =
            document.createElement(
                'canvas'
            );

        canvas.width = 512;
        canvas.height = 96;

        const ctx =
            canvas.getContext(
                '2d'
            );

        ctx.fillStyle =
            'rgba(5,10,18,.90)';

        ctx.fillRect(
            4,
            4,
            504,
            88
        );

        ctx.strokeStyle =
            '#' +
            color
                .toString(16)
                .padStart(6, '0');

        ctx.lineWidth = 4;

        ctx.strokeRect(
            4,
            4,
            504,
            88
        );

        ctx.fillStyle =
            '#' +
            color
                .toString(16)
                .padStart(6, '0');

        ctx.font =
            '700 28px Arial';

        ctx.textAlign =
            'center';

        ctx.textBaseline =
            'middle';

        ctx.fillText(
            text,
            256,
            48
        );

        const texture =
            new THREE.CanvasTexture(
                canvas
            );

        const sprite =
            new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true
                })
            );

        sprite.scale.set(
            12,
            2.25,
            1
        );

        sprite.position.set(
            x,
            y,
            z
        );

        ewScene.add(sprite);
    }


    // ============================================================
    // ROADS
    // ============================================================

    function makeRoad(
        x,
        z,
        width,
        depth
    ) {
        addBox(
            x,
            0,
            z,
            width,
            0.12,
            depth,
            C.ROAD,
            0.95
        );

        addBox(
            x - width / 2,
            0.12,
            z,
            0.18,
            0.035,
            depth,
            C.GRAY
        );

        addBox(
            x + width / 2,
            0.12,
            z,
            0.18,
            0.035,
            depth,
            C.GRAY
        );
    }


    function makeRoadMarkings() {

        // Main road
        for (
            let z = 30;
            z > -245;
            z -= 12
        ) {

            addBox(
                0,
                0.13,
                z,
                0.38,
                0.045,
                5.2,
                C.WHITE
            );
        }

        // Cross roads
        [-45, -105, -155].forEach(
            z => {

                for (
                    let x = -80;
                    x <= 80;
                    x += 12
                ) {

                    addBox(
                        x,
                        0.13,
                        z,
                        5.2,
                        0.045,
                        0.38,
                        C.WHITE
                    );
                }
            }
        );

        // Yellow center divider
        for (
            let z = 30;
            z > -245;
            z -= 9
        ) {

            addBox(
                0,
                0.17,
                z,
                0.08,
                0.03,
                3.5,
                C.WARNING
            );
        }
    }


    function makeSidewalks() {

        addBox(
            -12,
            0,
            -105,
            3,
            0.22,
            280,
            C.SIDEWALK
        );

        addBox(
            12,
            0,
            -105,
            3,
            0.22,
            280,
            C.SIDEWALK
        );

        [-45, -105, -155].forEach(
            z => {

                addBox(
                    0,
                    0,
                    z - 8,
                    180,
                    0.22,
                    2.8,
                    C.SIDEWALK
                );

                addBox(
                    0,
                    0,
                    z + 8,
                    180,
                    0.22,
                    2.8,
                    C.SIDEWALK
                );
            }
        );
    }


    // ============================================================
    // BEACH
    // ============================================================

    function makeBeach() {

        addBox(
            0,
            0,
            -170,
            180,
            0.08,
            35,
            0xB5A47D
        );

        const sea =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    240,
                    110
                ),
                new THREE.MeshStandardMaterial({
                    color: 0x247FAC,
                    transparent: true,
                    opacity: 0.92,
                    roughness: 0.35
                })
            );

        sea.rotation.x =
            -Math.PI / 2;

        sea.position.set(
            0,
            0.04,
            -215
        );

        ewScene.add(sea);

        for (
            let i = 0;
            i < 12;
            i++
        ) {

            makeTree(
                -75 + i * 14,
                -160 +
                    (i % 2) * 4,
                0.62 +
                    (i % 3) *
                    0.08,
                i + 2
            );
        }

        addLocationLabel(
            'BEACH • TSUNAMI ZONE',
            0,
            6,
            -158,
            0x8BE9FD
        );
    }


    // ============================================================
    // WORLD
    // ============================================================

    function makeWorld() {

        ewScene.background =
            new THREE.Color(
                C.BLUE
            );

        ewScene.fog =
            new THREE.Fog(
                C.BLUE,
                95,
                300
            );

        // Lighting
        const hemi =
            new THREE.HemisphereLight(
                0xDCEFFF,
                0x30443A,
                1.55
            );

        ewScene.add(hemi);

        const sun =
            new THREE.DirectionalLight(
                C.WHITE,
                1.35
            );

        sun.position.set(
            -70,
            100,
            40
        );

        ewScene.add(sun);


        // ========================================================
        // GROUND
        // ========================================================

        const ground =
            new THREE.Mesh(
                new THREE.PlaneGeometry(
                    500,
                    500
                ),
                new THREE.MeshStandardMaterial({
                    color: C.GRASS,
                    roughness: 1
                })
            );

        ground.rotation.x =
            -Math.PI / 2;

        ewScene.add(ground);


        // ========================================================
        // ROAD NETWORK
        // ========================================================

        makeRoad(
            0,
            -105,
            24,
            280
        );

        [-45, -105, -155].forEach(
            z => {
                makeRoad(
                    0,
                    z,
                    180,
                    20
                );
            }
        );

        makeSidewalks();
        makeRoadMarkings();


        // ========================================================
        // MAIN CITY BUILDINGS
        // ========================================================

        // Earthquake landmark
        try {

            const buildingTexture =
                loadTexture(
                    ASSETS.building
                );

            makeCutout(
                buildingTexture,
                -24,
                0,
                -38,
                17,
                23,
                0,
                true
            );

        } catch (error) {

            makeOffice(
                -24,
                -38,
                14,
                18,
                11,
                C.NAVY,
                C.WARNING
            );
        }

        addLocationLabel(
            'EARTHQUAKE LEARNING ZONE',
            -24,
            28,
            -38,
            C.WARNING
        );


        // Different office blocks
        makeOffice(
            25,
            -18,
            12,
            15,
            10,
            C.NAVY,
            C.BLUE
        );

        makeResidential(
            -28,
            -70,
            0
        );

        makeResidential(
            27,
            -72,
            1
        );

        makeOffice(
            -27,
            -105,
            14,
            22,
            11,
            C.SLATE,
            C.NAVY
        );

        makeOffice(
            28,
            -110,
            11,
            10,
            10,
            C.GRAY,
            C.BLUE
        );

        makeShop(
            -28,
            -142,
            C.DARK_BLUE
        );

        makeShop(
            28,
            -140,
            C.NAVY
        );


        // ========================================================
        // SKYLINE
        // ========================================================

        makeTower(
            -52,
            -82,
            12,
            38,
            12,
            C.NAVY
        );

        makeTower(
            51,
            -92,
            10,
            31,
            11,
            C.SLATE
        );

        makeTower(
            -52,
            -128,
            14,
            48,
            14,
            C.BLACK
        );

        makeTower(
            52,
            -132,
            12,
            42,
            12,
            C.GRAY
        );


        // Distant skyline
        const skyline = [
            [-70, -70, 9, 18],
            [-62, -100, 8, 24],
            [65, -74, 8, 20],
            [72, -112, 10, 27],
            [-72, -145, 11, 22],
            [70, -148, 9, 18]
        ];

        skyline.forEach(
            (b, i) => {

                addBox(
                    b[0],
                    0,
                    b[1],
                    b[2],
                    b[3],
                    9,
                    i % 2
                        ? C.DARK_BLUE
                        : C.SLATE
                );
            }
        );


        // ========================================================
        // PUBLIC SAFETY DISTRICT
        // ========================================================

        makeSchool(
            -48,
            -48
        );

        makeHospital(
            48,
            -48
        );

        makeFireStation(
            48,
            -125
        );

        addLocationLabel(
            'PUBLIC SAFETY DISTRICT',
            0,
            8,
            -48,
            C.WHITE
        );


        // ========================================================
        // PARK
        // ========================================================

        makePark(
            0,
            -70,
            28,
            24
        );


        // ========================================================
        // VARIED TREES
        // ========================================================

        const trees = [
            [-17, 22, 0.75, 1],
            [17, 20, 0.90, 2],
            [-17, -5, 0.68, 3],
            [17, -8, 0.82, 4],
            [-17, -62, 0.75, 5],
            [17, -62, 0.95, 6],
            [-17, -94, 0.70, 7],
            [17, -94, 0.85, 8],
            [-17, -128, 0.72, 9],
            [17, -128, 0.65, 10]
        ];

        trees.forEach(
            tree => {
                makeTree(
                    tree[0],
                    tree[1],
                    tree[2],
                    tree[3]
                );
            }
        );


        // ========================================================
        // VARIED VEHICLES
        // ========================================================

        makeCar(
            -5.5,
            18,
            0,
            0.75,
            1
        );

        makeCar(
            5.5,
            -10,
            Math.PI,
            0.78,
            2
        );

        makeCar(
            -5.5,
            -52,
            0,
            0.80,
            3
        );

        makeCar(
            5.5,
            -86,
            Math.PI,
            0.72,
            4
        );

        makeCar(
            -5.5,
            -120,
            0,
            0.80,
            5
        );

        makeCar(
            5.5,
            -150,
            Math.PI,
            0.74,
            6
        );

        makeBus(
            -6,
            -45,
            0
        );

        makeBus(
            6,
            -105,
            Math.PI
        );


        // ========================================================
        // STREET LIGHTS
        // ========================================================

        for (
            let z = 20;
            z > -205;
            z -= 28
        ) {

            makeStreetLight(
                -14.8,
                z,
                0
            );

            makeStreetLight(
                14.8,
                z + 8,
                Math.PI
            );
        }


        // ========================================================
        // TRAFFIC LIGHTS
        // ========================================================

        [-45, -105, -155].forEach(
            z => {

                makeTrafficLight(
                    -14,
                    z - 10,
                    0
                );

                makeTrafficLight(
                    14,
                    z + 10,
                    Math.PI
                );
            }
        );


        // ========================================================
        // BEACH
        // ========================================================

        makeBeach();


        // ========================================================
        // CLOUDS
        // ========================================================

        makeCloud(
            -65,
            44,
            -65,
            1
        );

        makeCloud(
            25,
            50,
            -120,
            0.8
        );

        makeCloud(
            65,
            43,
            -10,
            0.7
        );


        // ========================================================
        // CITY SIGN
        // ========================================================

        addLocationLabel(
            'EDUSHIELD CITY',
            0,
            10,
            18,
            C.WHITE
        );
    }


    // ============================================================
    // OPEN WORLD
    // ============================================================

    function openExploreWorld() {

        if (
            !document.getElementById(
                'screen-explore'
            )
        ) {
            return;
        }

        if (
            typeof stop3DScene ===
            'function'
        ) {
            stop3DScene();
        }

        const dyn =
            document.getElementById(
                'dynamic-canvas'
            );

        if (dyn) {
            dyn.style.display =
                'none';
        }

        showScreen(
            'screen-explore'
        );

        if (!ewStarted) {
            initExploreWorld();
        }

        const card =
            document.getElementById(
                'explore-location-card'
            );

        if (card) {
            card.classList.remove(
                'show'
            );
        }

        ewWorldActive = true;

        if (ewCamera) {
            ewCamera.position.set(
                0,
                2,
                18
            );
        }
    }


    // ============================================================
    // INITIALIZE
    // ============================================================

    function initExploreWorld() {

        const canvas =
            document.getElementById(
                'explore-canvas'
            );

        if (!canvas) {
            console.error(
                'EduShield: #explore-canvas not found.'
            );
            return;
        }

        ewStarted = true;
        ewWorldActive = true;

        ewScene =
            new THREE.Scene();

        ewCamera =
            new THREE.PerspectiveCamera(
                75,
                innerWidth /
                    innerHeight,
                0.1,
                700
            );

        ewCamera.position.set(
            0,
            2,
            18
        );

        ewRenderer =
            new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true,
                powerPreference:
                    'high-performance'
            });

        ewRenderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                1.6
            )
        );

        ewRenderer.setSize(
            innerWidth,
            innerHeight
        );

        if (
            'outputColorSpace'
            in ewRenderer &&
            THREE.SRGBColorSpace
        ) {
            ewRenderer.outputColorSpace =
                THREE.SRGBColorSpace;
        }

        canvas.addEventListener(
            'click',
            () => {

                if (
                    !ewWorldActive ||
                    ewPromptOpen
                ) {
                    return;
                }

                canvas.requestPointerLock?.();
            }
        );

        document.addEventListener(
            'pointerlockchange',
            () => {

                ewPointerLocked =
                    document.pointerLockElement ===
                    canvas;
            }
        );

        document.addEventListener(
            'mousemove',
            event => {

                if (
                    !ewPointerLocked ||
                    !ewWorldActive
                ) {
                    return;
                }

                ewYaw -=
                    event.movementX *
                    0.0022;

                ewPitch -=
                    event.movementY *
                    0.0018;

                ewPitch =
                    Math.max(
                        -1.35,
                        Math.min(
                            1.35,
                            ewPitch
                        )
                    );

                ewCamera.rotation.order =
                    'YXZ';

                ewCamera.rotation.y =
                    ewYaw;

                ewCamera.rotation.x =
                    ewPitch;
            }
        );

        makeWorld();

        ewClock.start();

        animateExplore();
    }


    // ============================================================
    // MOVEMENT
    // ============================================================

    function updateMovement() {

        if (
            !ewWorldActive ||
            ewPromptOpen
        ) {
            return;
        }

        const dt =
            Math.min(
                ewClock.getDelta(),
                0.05
            );

        const speed =
            8 * dt;

        const sin =
            Math.sin(ewYaw);

        const cos =
            Math.cos(ewYaw);

        if (ewKeys.w) {
            ewCamera.position.x -=
                sin * speed;

            ewCamera.position.z -=
                cos * speed;
        }

        if (ewKeys.s) {
            ewCamera.position.x +=
                sin * speed;

            ewCamera.position.z +=
                cos * speed;
        }

        if (ewKeys.a) {
            ewCamera.position.x -=
                cos * speed;

            ewCamera.position.z +=
                sin * speed;
        }

        if (ewKeys.d) {
            ewCamera.position.x +=
                cos * speed;

            ewCamera.position.z -=
                sin * speed;
        }

        ewCamera.position.y = 2;

        ewCamera.position.x =
            Math.max(
                -82,
                Math.min(
                    82,
                    ewCamera.position.x
                )
            );

        ewCamera.position.z =
            Math.max(
                -245,
                Math.min(
                    35,
                    ewCamera.position.z
                )
            );
    }


    // ============================================================
    // PROXIMITY
    // ============================================================

    function updateProximity() {

        if (!ewCamera) {
            return;
        }

        const p =
            ewCamera.position;

        const buildingDistance =
            Math.hypot(
                p.x -
                    buildingPos.x,
                p.z -
                    buildingPos.z
            );

        const beachDistance =
            Math.abs(
                p.z -
                    beachZ
            );

        const nearBuilding =
            buildingDistance < 12 &&
            p.z < -25 &&
            p.z > -55;

        const nearBeach =
            beachDistance < 11 &&
            p.z < -145;

        if (
            nearBuilding &&
            !ewNearBuilding
        ) {

            showPrompt(
                'Earthquake Learning Zone',
                'You entered the earthquake learning building area. Test your earthquake response.',
                '⚠️'
            );
        }

        if (
            nearBeach &&
            !ewNearBeach
        ) {

            showPrompt(
                'Tsunami Learning Zone',
                'You reached the coast. This zone will connect to the tsunami preparedness challenge next.',
                '🌊'
            );
        }

        ewNearBuilding =
            nearBuilding;

        ewNearBeach =
            nearBeach;
    }


    // ============================================================
    // PROMPT
    // ============================================================

    function showPrompt(
        title,
        text,
        icon
    ) {
        ewPromptOpen = true;

        const titleEl =
            document.getElementById(
                'explore-location-title'
            );

        const textEl =
            document.getElementById(
                'explore-location-text'
            );

        const iconEl =
            document.querySelector(
                '.location-icon'
            );

        const button =
            document.querySelector(
                '#explore-location-card .btn-submit'
            );

        if (titleEl) {
            titleEl.innerText =
                title;
        }

        if (textEl) {
            textEl.innerText =
                text;
        }

        if (iconEl) {
            iconEl.innerText =
                icon;
        }

        if (button) {

            button.innerText =
                title.includes(
                    'Tsunami'
                )
                    ? 'Open Tsunami Challenge'
                    : 'Start Earthquake Challenge';
        }

        const card =
            document.getElementById(
                'explore-location-card'
            );

        if (card) {
            card.classList.add(
                'show'
            );
        }
    }


    // ============================================================
    // CHALLENGE
    // ============================================================

    function startExploreChallenge() {

        const title =
            document.getElementById(
                'explore-location-title'
            )?.innerText || '';

        ewPromptOpen = false;

        const card =
            document.getElementById(
                'explore-location-card'
            );

        if (card) {
            card.classList.remove(
                'show'
            );
        }

        if (
            title.includes(
                'Tsunami'
            )
        ) {

            alert(
                'Tsunami Challenge is the next world expansion. The beach zone is ready for the scenario.'
            );

            return;
        }

        if (
            typeof launchJourney ===
            'function'
        ) {

            launchJourney(
                'earthquake'
            );

            setTimeout(
                () => {

                    if (
                        typeof switchStage ===
                        'function'
                    ) {
                        switchStage('03');
                    }

                },
                50
            );
        }
    }


    function closeExplorePrompt() {

        ewPromptOpen = false;

        const card =
            document.getElementById(
                'explore-location-card'
            );

        if (card) {
            card.classList.remove(
                'show'
            );
        }
    }


    // ============================================================
    // EXIT
    // ============================================================

    function exitExploreWorld() {

        ewWorldActive = false;

        if (ewAnimationId) {

            cancelAnimationFrame(
                ewAnimationId
            );

            ewAnimationId = null;
        }

        if (
            document.pointerLockElement
        ) {
            document.exitPointerLock?.();
        }

        ewPointerLocked = false;

        if (
            typeof goDashboard ===
            'function'
        ) {
            goDashboard();
        }
    }


    // ============================================================
    // ANIMATION
    // ============================================================

    function animateExplore() {

        if (!ewWorldActive) {
            return;
        }

        ewAnimationId =
            requestAnimationFrame(
                animateExplore
            );

        updateMovement();
        updateProximity();

        if (
            ewRenderer &&
            ewScene &&
            ewCamera
        ) {

            ewRenderer.render(
                ewScene,
                ewCamera
            );
        }
    }


    // ============================================================
    // KEYBOARD
    // ============================================================

    // ============================================
// KEYBOARD CONTROLS
// W/A/S/D ONLY CONTROL THE 3D WORLD
// ============================================

const MOVEMENT_KEYS = new Set([
    'w', 'a', 's', 'd',
    'arrowup', 'arrowdown',
    'arrowleft', 'arrowright',
    'shift'
]);

function isTypingElement(element) {
    if (!element) return false;

    const tag = element.tagName?.toLowerCase();

    return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        element.isContentEditable
    );
}

window.addEventListener('keydown', function (e) {

    // Never hijack keyboard input from login,
    // registration, search boxes, surveys, etc.
    if (isTypingElement(document.activeElement)) {
        return;
    }

    // Only process movement keys inside Explore World.
    if (!ewWorldActive) {
        return;
    }

    const key = e.key.toLowerCase();

    if (!MOVEMENT_KEYS.has(key)) {
        return;
    }

    ewKeys[key] = true;

    // Prevent page scrolling for movement keys ONLY
    // while actually inside the 3D world.
    e.preventDefault();
}, { passive: false });


window.addEventListener('keyup', function (e) {

    const key = e.key.toLowerCase();

    if (MOVEMENT_KEYS.has(key)) {
        ewKeys[key] = false;
    }
});


// Clear all movement when browser/window loses focus.
window.addEventListener('blur', function () {
    Object.keys(ewKeys).forEach(key => {
        ewKeys[key] = false;
    });
});


// ESC releases movement/pointer-lock state.
window.addEventListener('keyup', function (e) {

    if (e.key === 'Escape') {
        Object.keys(ewKeys).forEach(key => {
            ewKeys[key] = false;
        });
    }
});

    // ============================================================
    // RESIZE
    // ============================================================

    window.addEventListener(
        'resize',
        () => {

            if (
                !ewCamera ||
                !ewRenderer
            ) {
                return;
            }

            ewCamera.aspect =
                innerWidth /
                innerHeight;

            ewCamera.updateProjectionMatrix();

            ewRenderer.setSize(
                innerWidth,
                innerHeight
            );
        }
    );


    // ============================================================
    // PUBLIC FUNCTIONS
    // ============================================================

    window.openExploreWorld =
        openExploreWorld;

    window.exitExploreWorld =
        exitExploreWorld;

    window.startExploreChallenge =
        startExploreChallenge;

    window.closeExplorePrompt =
        closeExplorePrompt;

})();