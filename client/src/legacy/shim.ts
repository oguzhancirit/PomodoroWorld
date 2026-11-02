// Bridge that lets the original Pomodoro World room code (js/*.js, written for three r128 globals)
// run unchanged inside the new client (three 0.186, ES modules). Must be imported before the old files.
import * as T from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const sRGBEncoding = 3001, LinearEncoding = 3000;
// r128 "encoding" → today's colorSpace
Object.defineProperty(T.Texture.prototype, 'encoding', {
  configurable: true,
  get() { return this.colorSpace === T.SRGBColorSpace ? sRGBEncoding : LinearEncoding; },
  set(v: number) { this.colorSpace = v === sRGBEncoding ? T.SRGBColorSpace : T.NoColorSpace; },
});
Object.defineProperty(T.WebGLRenderer.prototype, 'outputEncoding', {
  configurable: true,
  get() { return this.outputColorSpace === T.SRGBColorSpace ? sRGBEncoding : LinearEncoding; },
  set(v: number) { this.outputColorSpace = v === sRGBEncoding ? T.SRGBColorSpace : T.LinearSRGBColorSpace; },
});
// three now converts colours itself; the old code's own colour patch must stay off
(T.Color.prototype as any).__pwCM = true;

// Old r128 lights ran in "legacy" mode: every light's irradiance was multiplied by π.
// r186 only has physical lights, so the same numbers come out ~3x dimmer and the scene looks
// flat and washed out (only the environment map is left). Give each light class an
// intensity accessor that stores value x π, so the old numbers mean what they used to.
function legacy<C extends new (...a: any[]) => T.Light>(Base: C) {
  return class extends Base {
    declare _li: number;
    // @ts-ignore accessor over the base field
    get intensity() { return this._li; }
    set intensity(v: number) { this._li = v * Math.PI; }
  };
}
// Point lights also used legacy falloff: I * (1 - d/range)^decay, without the 1/d² spike that
// burns a wall standing 10 cm from a floor lamp. Decay 0 removes the spike; the shorter range
// makes r186's smooth window fade about as fast as the old curve.
class LegacyPointLight extends legacy(T.PointLight) {
  declare _ld: number;
  constructor(color?: T.ColorRepresentation, intensity = 1, distance = 0, decay = 2) { super(color, intensity, distance, decay === 2 ? 0 : decay); }
  // @ts-ignore accessor over the base field
  get distance() { return this._ld; }
  set distance(v: number) { this._ld = v * 0.5; }
}
const LEGACY_LIGHTS = {
  PointLight: LegacyPointLight,
  DirectionalLight: legacy(T.DirectionalLight),
  HemisphereLight: legacy(T.HemisphereLight),
  AmbientLight: legacy(T.AmbientLight),
  SpotLight: legacy(T.SpotLight),
};
class WebGLMultisampleRenderTarget extends T.WebGLRenderTarget {
  constructor(w: number, h: number, o: T.RenderTargetOptions = {}) { super(w, h, { ...o, samples: 4 }); }
}

const W = window as any;
W.THREE = { ...T, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, GTAOPass, RoomEnvironment, WebGLMultisampleRenderTarget, ...LEGACY_LIGHTS, sRGBEncoding, LinearEncoding, SAOPass: undefined };
W.PW = W.PW || {};
export {};
