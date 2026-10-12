import * as THREE from 'three';

/* Transmission would need an opaque backdrop to refract, and the page behind
   these canvases is DOM. So glass is built in layers instead: a clear
   reflective skin front and back, and a fresnel shell that thickens the edges
   the way heavy glass does when you look through it at an angle.            */

export type GlassOptions = { env?: number; edge?: number; edgeAmount?: number; opacity?: number };

export function fresnelMaterial(color: number, amount: number, power = 2.2) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uAmt: { value: amount } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uPow; uniform float uAmt;
      varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
        gl_FragColor = vec4(uColor, clamp(f * uAmt, 0.0, 0.85));
      }`,
    transparent: true, depthWrite: false
  });
}

/** back skin, fresnel shell and front skin for one glass geometry */
export function layeredGlass(geo: THREE.BufferGeometry, o: GlassOptions = {}) {
  const env = o.env ?? 1;
  const front = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02,
    transparent: true, opacity: o.opacity ?? 0.07, depthWrite: false,
    specularIntensity: 1, ior: 1.52, clearcoat: 1, clearcoatRoughness: 0.02,
    envMapIntensity: 2.4 * env
  });
  const backMat = front.clone();
  backMat.side = THREE.BackSide;
  const back = new THREE.Mesh(geo, backMat); back.renderOrder = 1;
  const shell = new THREE.Mesh(geo, fresnelMaterial(o.edge ?? 0x5E4E3E, o.edgeAmount ?? 0.62)); shell.renderOrder = 2;
  const face = new THREE.Mesh(geo, front); face.renderOrder = 3;
  const g = new THREE.Group();
  g.add(back, shell, face);
  return g;
}
