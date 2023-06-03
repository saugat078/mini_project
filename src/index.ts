import { CharacterControls, CONTROLLER_BODY_RADIUS } from './utils/characterControls';
import { KeyDisplay } from './utils/keydisplay';
import { RigidBody, World } from '@dimforge/rapier3d';
import * as THREE from 'three';
import {  BoxBufferGeometry, MeshPhongMaterial } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 5;
camera.position.z = 10;
camera.position.x = -13;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// ORBIT CAMERA CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true
orbitControls.enablePan = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 20
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent camera below ground
orbitControls.minPolarAngle = Math.PI / 4        // prevent top down view
orbitControls.update();

//lights and shadows
const dLight = new THREE.DirectionalLight('white', 0.6);
dLight.position.x = 20;
dLight.position.y = 30;
dLight.castShadow = true;
dLight.shadow.mapSize.width = 4096;
dLight.shadow.mapSize.height = 4096;
const d = 35;
dLight.shadow.camera.left = - d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = - d;
scene.add(dLight);

const aLight = new THREE.AmbientLight('white', 0.4);
scene.add(aLight);


// ANIMATE
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// function loadTexture(path: string): THREE.Texture {
//     const texture = new THREE.TextureLoader().load(path);
//     texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
//     texture.repeat.x = 10;
//     texture.repeat.y = 10;
//     return texture;
// }


// MODEL WITH ANIMATIONS
var characterControls: CharacterControls

import('@dimforge/rapier3d').then(RAPIER => {

    function body(scene: THREE.Scene, world: World,
        bodyType: 'dynamic' | 'static' | 'kinematicPositionBased',
        colliderType: 'cube' | 'sphere' | 'cylinder' | 'cone', dimension: any,
        translation: { x: number, y: number, z: number },
        rotation: { x: number, y: number, z: number },
        color: string): { rigid: RigidBody, mesh: THREE.Mesh } {

        let bodyDesc

        if (bodyType === 'dynamic') {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic();
        } else if (bodyType === 'kinematicPositionBased') {
            bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
        } else if (bodyType === 'static') {
            bodyDesc = RAPIER.RigidBodyDesc.fixed();
            bodyDesc.setCanSleep(false);
        }

        if (translation) {
            bodyDesc.setTranslation(translation.x, translation.y, translation.z)
        }
        if(rotation) {
            const q = new THREE.Quaternion().setFromEuler(
                new THREE.Euler( rotation.x, rotation.y, rotation.z, 'XYZ' )
            )
            bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        }

        let rigidBody = world.createRigidBody(bodyDesc);

        let collider;
        if (colliderType === 'cube') {
            collider = RAPIER.ColliderDesc.cuboid(dimension.hx, dimension.hy, dimension.hz);
        } else if (colliderType === 'sphere') {
            collider = RAPIER.ColliderDesc.ball(dimension.radius);
        } else if (colliderType === 'cylinder') {
            collider = RAPIER.ColliderDesc.cylinder(dimension.hh, dimension.radius);
        } else if (colliderType === 'cone') {
            collider = RAPIER.ColliderDesc.cone(dimension.hh, dimension.radius);
            // cone center of mass is at bottom
            collider.centerOfMass = {x:0, y:0, z:0}
        }
        world.createCollider(collider, rigidBody.handle);

        let bufferGeometry;
        if (colliderType === 'cube') {
            bufferGeometry = new BoxBufferGeometry(dimension.hx * 2, dimension.hy * 2, dimension.hz * 2);
        } else if (colliderType === 'sphere') {
            bufferGeometry = new THREE.SphereBufferGeometry(dimension.radius, 32, 32);
        } else if (colliderType === 'cylinder') {
            bufferGeometry = new THREE.CylinderBufferGeometry(dimension.radius, 
                dimension.radius, dimension.hh * 2,  32, 32);
        } else if (colliderType === 'cone') {
            bufferGeometry = new THREE.ConeBufferGeometry(dimension.radius, dimension.hh * 2,  
                32, 32);
        }

        const threeMesh = new THREE.Mesh(bufferGeometry, new MeshPhongMaterial({ color: color }));
        threeMesh.castShadow = true;
        threeMesh.receiveShadow = true;
        scene.add(threeMesh);

        return { rigid: rigidBody, mesh: threeMesh };
    }
  //RAPIER module.
let gravity = { x: 0.0, y: -10, z: 0.0 };
let world = new RAPIER.World(gravity);

// Bodys
const bodys: { rigid: RigidBody, mesh: THREE.Mesh }[] = []

// Create Ground.
const staticB = body(scene, world, 'static', 'cube',
    { hx: 8, hy: 1, hz: 10 }, { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 }, 'yellow');
bodys.push(staticB);

const cubeBody = body(scene, world, 'dynamic', 'cube',
    { hx: 1, hy: 1, hz: 1 }, { x: 0, y: 15, z: 0 },
    { x: 0, y: 0.4, z: 0.7 }, 'orange');
bodys.push(cubeBody);

const sphereBody = body(scene, world, 'dynamic', 'sphere',
    { radius: 0.7 }, { x: 4, y: 15, z: 2 },
    { x: 0, y: 1, z: 0 }, 'blue');
bodys.push(sphereBody);

// const sphereBody2 = body(scene, world, 'dynamic', 'sphere',
//     { radius: 0.7 }, { x: 0, y: 15, z: 0 },
//     { x: 0, y: 1, z: 0 }, 'red');
// bodys.push(sphereBody2);

const cylinderBody = body(scene, world, 'dynamic', 'cylinder',
    { hh: 1.0, radius: 0.7 }, { x: -7, y: 15, z: 8 },
    { x: 0, y: 1, z: 0 }, 'green');
bodys.push(cylinderBody);

const coneBody = body(scene, world, 'dynamic', 'cone',
    { hh: 1.0, radius: 1 }, { x: 7, y: 15, z: -8 },
    { x: 0, y: 1, z: 0 }, 'purple');
bodys.push(coneBody);

    // character controller
    new GLTFLoader().load('models/Soldier.glb', function (gltf) {
        const model = gltf.scene;
        model.traverse(function (object: any) {
            if (object.isMesh) object.castShadow = true;
        });
        scene.add(model);
    
        const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
        const mixer = new THREE.AnimationMixer(model);
        const animationsMap: Map<string, THREE.AnimationAction> = new Map()
        gltfAnimations.filter(a => a.name != 'TPose').forEach((a: THREE.AnimationClip) => {
            animationsMap.set(a.name, mixer.clipAction(a))
        })
    

        // RIGID BODY
        let bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-1, 3, 1)
        let rigidBody = world.createRigidBody(bodyDesc);
        let dynamicCollider = RAPIER.ColliderDesc.ball(CONTROLLER_BODY_RADIUS);
        world.createCollider(dynamicCollider, rigidBody.handle);

        characterControls = new CharacterControls(model, mixer, 
            animationsMap, orbitControls, 
            camera,  'Idle',
            new RAPIER.Ray( 
                { x: 0, y: 0, z: 0 },
                { x: 0, y: -1, z: 0} 
            ), rigidBody)
    });

    const clock = new THREE.Clock();
    // Game loop.
    let gameLoop = () => {
        let deltaTime = clock.getDelta();

        if (characterControls) {
            characterControls.update(world, deltaTime, keysPressed);
        }

        // Step the simulation forward.  
        world.step();
        // update 3d world with physical world
        bodys.forEach(body => {
            let position = body.rigid.translation();
            let rotation = body.rigid.rotation();

            body.mesh.position.x = position.x
            body.mesh.position.y = position.y
            body.mesh.position.z = position.z

            body.mesh.setRotationFromQuaternion(
                new THREE.Quaternion(rotation.x,
                    rotation.y,
                    rotation.z,
                    rotation.w));
        });

        orbitControls.update()
        renderer.render(scene, camera);
        
        setTimeout(gameLoop,10);
    };

    gameLoop();
})


const keysPressed: any = {}
const keyDisplayQueue = new KeyDisplay();
document.addEventListener('keydown', (event) => {
    keyDisplayQueue.down(event.key)
    if (event.shiftKey && characterControls) {
        characterControls.switchRunToggle()
    }
    keysPressed[event.key.toLowerCase()] = true
}, false);
document.addEventListener('keyup', (event) => {
    keyDisplayQueue.up(event.key);
    keysPressed[event.key.toLowerCase()] = false
}, false);