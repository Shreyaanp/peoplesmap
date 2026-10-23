import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from 'maplibre-gl';
import type { GlowCell } from '../../api/types';
import { glow, type ThemeName } from '../../tokens';

/**
 * Tag Weather: the amber glow clouds, drawn by our own WebGL layer.
 * One instanced quad per glow (a cell's matches, and a fainter one for related-tag matches),
 * a radial cream → honey → burnt → transparent gradient, and a time uniform for breathing.
 * Nothing here re-renders React; the frame loop only asks MapLibre to repaint.
 */

export interface GlowLayer extends CustomLayerInterface {
  /** Replaces the glows. New ones fade in, gone ones fade out; related glows follow a beat later. */
  setCells(cells: readonly GlowCell[], resolution: 6 | 7 | 8): void;
  setTheme(theme: ThemeName): void;
  /** Reduced motion: no breathing, no fades. */
  setStill(still: boolean): void;
  /** True while something on screen still moves (breathing or a fade). */
  isAnimating(): boolean;
}

/** Breathing period: the liquid long duration × 4, the same as the CSS breathe. */
const breathePeriodS = 4.8;
const fadeS = 0.6;
/** The Ripple: related glows appear this much later than direct matches. */
const rippleDelayS = 0.3;
/** H3 edge length per resolution, in metres. */
const edgeMetres = { 6: 3725, 7: 1406, 8: 531 } as const;
const earthCircumference = 40_075_016.686;
/** Per theme: how strongly glows show, and how far burnt amber lifts toward honey. */
const themeLook = { light: { gain: 1.35, warmth: 0 }, dark: { gain: 1.9, warmth: 0.35 } } as const;
/** Floats per instance: center.xy, radius, intensity, related, phase, born, died. */
const stride = 8;

const vertexSource = `#version 300 es
uniform mat4 u_matrix;
uniform float u_time;
uniform float u_breathe;
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec2 a_center;
layout(location = 2) in vec4 a_props;
layout(location = 3) in vec2 a_life;
out vec2 v_uv;
out float v_alpha;
out float v_related;
out float v_intensity;
void main() {
  float wave = sin(u_time * ${((2 * Math.PI) / breathePeriodS).toFixed(5)} + a_props.w);
  float fadeIn = smoothstep(a_life.x, a_life.x + ${fadeS.toFixed(2)}, u_time);
  float fadeOut = a_life.y < 0.0 ? 1.0 : 1.0 - smoothstep(a_life.y, a_life.y + ${fadeS.toFixed(2)}, u_time);
  vec2 position = a_center + a_corner * a_props.x * (1.0 + u_breathe * wave);
  v_uv = a_corner;
  v_related = a_props.z;
  v_intensity = a_props.y;
  // Quiet cells are a faint haze; only dense cells really glow. Breathing moves brightness a little too.
  float strength = 0.05 + 0.55 * pow(a_props.y, 1.6);
  v_alpha = fadeIn * fadeOut * strength * mix(1.0, 0.5, a_props.z) * (1.0 + u_breathe * 2.0 * wave);
  gl_Position = u_matrix * vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision mediump float;
uniform float u_opacity;
uniform float u_gain;
uniform float u_warmth;
uniform vec3 u_core;
uniform vec3 u_honey;
uniform vec3 u_burnt;
in vec2 v_uv;
in float v_alpha;
in float v_related;
in float v_intensity;
out vec4 fragColor;
void main() {
  float d = length(v_uv);
  if (d >= 1.0) discard;
  // Soft, cloud-like falloff, so neighbouring cells merge into one weather system.
  float alpha = exp(-d * d * 4.0) * (1.0 - smoothstep(0.8, 1.0, d));
  // --glow-gradient's ramp: burnt at the edge, honey inside, a cream core only where people are densest.
  vec3 color = mix(u_burnt, u_honey, 1.0 - smoothstep(0.25, 0.75, d));
  float core = smoothstep(0.55, 1.0, v_intensity) * (1.0 - smoothstep(0.0, 0.3, d)) * (1.0 - v_related);
  color = mix(color, u_core, core);
  // Related glows (the Ripple) are a honey haze without a core.
  color = mix(color, u_honey, v_related * 0.5);
  // On charcoal, burnt amber reads as brown smog: lift it toward honey so the light feels lit.
  color = mix(color, u_honey, u_warmth);
  alpha = min(1.0, alpha * v_alpha * u_gain) * u_opacity;
  fragColor = vec4(color * alpha, alpha);
}`;

function hexToVec3(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** A stable phase per cell, so neighbours breathe out of step. */
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return ((h >>> 0) % 6283) / 1000;
}

function mercator(lng: number, lat: number): [number, number] {
  const x = (lng + 180) / 360;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return [x, y];
}

interface Instance {
  key: string;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  related: number;
  phase: number;
  born: number;
  died: number;
}

/** Glow opacity by zoom: full over the city, fading as the map morphs into tag pins. */
export function glowOpacityAt(zoom: number): number {
  const t = Math.min(1, Math.max(0, (zoom - 13) / 1.5));
  return 1 - t * t * (3 - 2 * t);
}

export function createGlowLayer(id = 'glows'): GlowLayer {
  let map: MapLibreMap | undefined;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let instanceBuffer: WebGLBuffer | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let instances = new Map<string, Instance>();
  let dirty = true;
  let theme: ThemeName = 'light';
  let still = false;
  const start = performance.now();
  const now = () => (performance.now() - start) / 1000;

  function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Glow layer: cannot create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Glow layer shader: ${gl.getShaderInfoLog(shader) ?? 'unknown error'}`);
    }
    return shader;
  }

  function setup(gl: WebGL2RenderingContext): void {
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Glow layer link: ${gl.getProgramInfoLog(program) ?? 'unknown error'}`);
    }
    uniforms = Object.fromEntries(
      [
        'u_matrix',
        'u_time',
        'u_breathe',
        'u_opacity',
        'u_gain',
        'u_warmth',
        'u_core',
        'u_honey',
        'u_burnt',
      ].map((name) => [name, gl.getUniformLocation(program as WebGLProgram, name)]),
    );

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    const bytes = stride * 4;
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, bytes, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, bytes, 8);
    gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, bytes, 24);
    gl.vertexAttribDivisor(3, 1);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    dirty = true;
  }

  function upload(gl: WebGL2RenderingContext): void {
    const data = new Float32Array(instances.size * stride);
    let i = 0;
    for (const g of instances.values()) {
      data.set([g.x, g.y, g.radius, g.intensity, g.related, g.phase, g.born, g.died], i * stride);
      i++;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    dirty = false;
  }

  /** Drops glows whose fade-out has finished. */
  function compact(t: number): void {
    for (const [key, g] of instances) {
      if (g.died >= 0 && t > g.died + fadeS) {
        instances.delete(key);
        dirty = true;
      }
    }
  }

  const layer: GlowLayer = {
    id,
    type: 'custom',
    renderingMode: '2d',

    onAdd(m, gl) {
      map = m;
      setup(gl);
    },

    onRemove(_m, gl) {
      if (program) gl.deleteProgram(program);
      if (vao) gl.deleteVertexArray(vao);
      if (instanceBuffer) gl.deleteBuffer(instanceBuffer);
      program = null;
      vao = null;
      instanceBuffer = null;
    },

    render(gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
      if (!program || !map) return;
      const t = still ? 1e6 : now();
      compact(t);
      if (dirty) upload(gl);
      const opacity = glowOpacityAt(map.getZoom());
      if (instances.size === 0 || opacity <= 0) return;

      gl.useProgram(program);
      gl.uniformMatrix4fv(
        uniforms.u_matrix ?? null,
        false,
        options.defaultProjectionData.mainMatrix as Float32Array,
      );
      gl.uniform1f(uniforms.u_time ?? null, t);
      gl.uniform1f(uniforms.u_breathe ?? null, still ? 0 : 0.035);
      gl.uniform1f(uniforms.u_opacity ?? null, opacity);
      gl.uniform1f(uniforms.u_gain ?? null, themeLook[theme].gain);
      gl.uniform1f(uniforms.u_warmth ?? null, themeLook[theme].warmth);
      gl.uniform3fv(uniforms.u_core ?? null, hexToVec3(glow.core));
      gl.uniform3fv(uniforms.u_honey ?? null, hexToVec3(glow.honey));
      gl.uniform3fv(uniforms.u_burnt ?? null, hexToVec3(glow.burnt));

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      // Dark: light adds up like real light (screen). Light: premultiplied "over", so amber never washes out.
      if (theme === 'dark') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instances.size);
      gl.bindVertexArray(null);
    },

    setCells(cells, resolution) {
      const t = still ? -1e6 : now();
      const max = Math.max(1, ...cells.map((c) => Math.max(c.count, c.relatedCount ?? 0)));
      const next = new Map<string, Instance>();
      for (const cell of cells) {
        const [x, y] = mercator(cell.center.lng, cell.center.lat);
        const unitsPerMetre = 1 / (earthCircumference * Math.cos((cell.center.lat * Math.PI) / 180));
        const phase = phaseOf(cell.cell);
        const add = (key: string, count: number, related: number, delay: number) => {
          if (count <= 0) return;
          const intensity = Math.sqrt(count / max);
          const radius = edgeMetres[resolution] * (1.3 + 0.9 * intensity) * unitsPerMetre;
          const existing = instances.get(key);
          const alive = existing && existing.died < 0;
          next.set(key, {
            key,
            x,
            y,
            radius,
            intensity,
            related,
            phase,
            born: alive ? existing.born : t + delay,
            died: -1,
          });
        };
        add(`${cell.cell}:m`, cell.count, 0, 0);
        add(`${cell.cell}:r`, cell.relatedCount ?? 0, 1, rippleDelayS);
      }
      // Glows that left keep fading out for a moment.
      for (const [key, g] of instances) {
        if (!next.has(key)) next.set(key, g.died >= 0 ? g : { ...g, died: t });
      }
      instances = next;
      dirty = true;
      map?.triggerRepaint();
    },

    setTheme(nextTheme) {
      theme = nextTheme;
      map?.triggerRepaint();
    },

    setStill(nextStill) {
      still = nextStill;
      map?.triggerRepaint();
    },

    isAnimating() {
      if (!map || instances.size === 0 || glowOpacityAt(map.getZoom()) <= 0) return false;
      if (!still) return true;
      return [...instances.values()].some((g) => g.died >= 0);
    },
  };
  return layer;
}
