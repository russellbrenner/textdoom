/**
 * WebGL-based 3D ASCII Renderer
 * Renders ASCII characters as billboarded quads in 3D space
 */

import type { GameConfig, Vec2 } from './types';

// Character atlas configuration
const ATLAS_CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~░▒▓█▄▀│─┌┐└┘├┤┬┴┼╔╗╚╝║═╠╣╦╩╬●○◉◎★☆▲▼◆◇■□▪▫♠♣♥♦←→↑↓↔↕∙·•‣⁃';
const ATLAS_COLS = 16;
const ATLAS_CHAR_SIZE = 32; // pixels per character in atlas

// Shader sources
const VERTEX_SHADER = `#version 300 es
precision highp float;

// Per-vertex attributes
in vec2 a_position;      // Quad corner (-0.5 to 0.5)
in vec2 a_texCoord;      // UV within quad (0 to 1)

// Per-instance attributes
in vec3 a_worldPos;      // 3D position in world
in vec2 a_charUV;        // UV offset in atlas for this character
in vec4 a_color;         // RGBA color
in float a_scale;        // Size multiplier
in float a_glow;         // Glow intensity (0-1)
in float a_rotation;     // Rotation in radians

// Uniforms
uniform mat4 u_viewProj;     // Combined view-projection matrix
uniform vec3 u_cameraPos;    // Camera position for billboarding
uniform vec3 u_cameraRight;  // Camera right vector
uniform vec3 u_cameraUp;     // Camera up vector
uniform vec2 u_charSize;     // Size of one char in atlas UV space
uniform float u_time;        // Animation time

out vec2 v_texCoord;
out vec4 v_color;
out float v_glow;

void main() {
  // Apply rotation
  float c = cos(a_rotation);
  float s = sin(a_rotation);
  vec2 rotatedPos = vec2(
    a_position.x * c - a_position.y * s,
    a_position.x * s + a_position.y * c
  );

  // Billboard: always face camera
  vec3 worldPos = a_worldPos
    + u_cameraRight * rotatedPos.x * a_scale
    + u_cameraUp * rotatedPos.y * a_scale;

  gl_Position = u_viewProj * vec4(worldPos, 1.0);

  // Pass UV coordinates (offset by character position in atlas)
  v_texCoord = a_charUV + a_texCoord * u_charSize;
  v_color = a_color;
  v_glow = a_glow;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec4 v_color;
in float v_glow;

uniform sampler2D u_atlas;
uniform float u_time;

out vec4 fragColor;

void main() {
  vec4 texColor = texture(u_atlas, v_texCoord);

  // Discard transparent pixels
  if (texColor.a < 0.1) discard;

  // Apply instance color
  vec3 color = v_color.rgb * texColor.rgb;

  // Add glow effect
  if (v_glow > 0.0) {
    float pulse = 0.8 + 0.2 * sin(u_time * 5.0);
    color += v_glow * pulse * v_color.rgb * 0.5;
  }

  fragColor = vec4(color, texColor.a * v_color.a);
}
`;

// Post-processing shaders
const POST_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}
`;

const POST_FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_scene;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_bloomIntensity;
uniform float u_scanlineIntensity;
uniform float u_vignetteIntensity;
uniform float u_chromaticAberration;
uniform float u_screenShake;
uniform vec3 u_damageFlash;
uniform float u_crtCurvature;

// CRT screen curvature
vec2 curveUV(vec2 uv) {
  if (u_crtCurvature <= 0.0) return uv;
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(u_crtCurvature);
  uv = uv + uv * offset * offset;
  uv = uv * 0.5 + 0.5;
  return uv;
}

void main() {
  // Apply screen shake
  vec2 uv = v_texCoord;
  if (u_screenShake > 0.0) {
    uv.x += sin(u_time * 50.0) * u_screenShake * 0.01;
    uv.y += cos(u_time * 45.0) * u_screenShake * 0.01;
  }

  // Apply CRT curvature
  uv = curveUV(uv);

  // Check bounds after curvature
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Chromatic aberration
  vec3 color;
  if (u_chromaticAberration > 0.0) {
    float aberr = u_chromaticAberration * 0.003;
    color.r = texture(u_scene, uv + vec2(aberr, 0.0)).r;
    color.g = texture(u_scene, uv).g;
    color.b = texture(u_scene, uv - vec2(aberr, 0.0)).b;
  } else {
    color = texture(u_scene, uv).rgb;
  }

  // Bloom (simple blur of bright areas)
  if (u_bloomIntensity > 0.0) {
    vec3 bloom = vec3(0.0);
    float bloomSize = 2.0 / u_resolution.x;
    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec3 sample = texture(u_scene, uv + vec2(float(x), float(y)) * bloomSize).rgb;
        float brightness = dot(sample, vec3(0.299, 0.587, 0.114));
        if (brightness > 0.7) {
          bloom += sample * (brightness - 0.7);
        }
      }
    }
    color += bloom * u_bloomIntensity * 0.04;
  }

  // Scanlines
  if (u_scanlineIntensity > 0.0) {
    float scanline = sin(uv.y * u_resolution.y * 1.5) * 0.5 + 0.5;
    color *= 1.0 - u_scanlineIntensity * 0.3 * scanline;
  }

  // Vignette
  if (u_vignetteIntensity > 0.0) {
    float dist = distance(uv, vec2(0.5));
    color *= 1.0 - u_vignetteIntensity * dist * dist * 2.0;
  }

  // Damage flash overlay
  color = mix(color, u_damageFlash, length(u_damageFlash) * 0.3);

  fragColor = vec4(color, 1.0);
}
`;

/** Instance data for a single ASCII character */
export interface CharInstance {
  x: number;
  y: number;
  z: number;
  char: string;
  color: [number, number, number, number]; // RGBA 0-1
  scale: number;
  glow: number;
  rotation: number;
}

/** Post-processing settings */
export interface PostProcessSettings {
  bloomIntensity: number;      // 0-1
  scanlineIntensity: number;   // 0-1
  vignetteIntensity: number;   // 0-1
  chromaticAberration: number; // 0-1
  screenShake: number;         // 0-1
  damageFlash: [number, number, number]; // RGB
  crtCurvature: number;        // 0 = off, 6 = subtle, 3 = strong
}

/**
 * WebGL 3D ASCII Renderer
 */
export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  public config: GameConfig;

  // Shader programs
  private mainProgram: WebGLProgram | null = null;
  private postProgram: WebGLProgram | null = null;

  // Buffers
  private quadVAO: WebGLVertexArrayObject | null = null;
  private instanceBuffer: WebGLBuffer | null = null;
  private postVAO: WebGLVertexArrayObject | null = null;

  // Textures
  private atlasTexture: WebGLTexture | null = null;
  private charMap: Map<string, [number, number]> = new Map(); // char -> UV offset

  // Framebuffer for post-processing
  private framebuffer: WebGLFramebuffer | null = null;
  private sceneTexture: WebGLTexture | null = null;

  // Camera state
  private cameraPos: [number, number, number] = [0, 0, 0];
  private cameraDir: [number, number, number] = [1, 0, 0];
  private cameraRight: [number, number, number] = [0, 0, 1];
  private cameraUp: [number, number, number] = [0, 1, 0];

  // Animation
  private time: number = 0;

  // Post-processing defaults
  private postProcess: PostProcessSettings = {
    bloomIntensity: 0.3,
    scanlineIntensity: 0.2,
    vignetteIntensity: 0.4,
    chromaticAberration: 0.2,
    screenShake: 0,
    damageFlash: [0, 0, 0],
    crtCurvature: 8,
  };

  // Instance data
  private instances: CharInstance[] = [];
  private maxInstances = 50000;
  private instanceData: Float32Array;
  private instanceStride = 13; // floats per instance

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.config = config;

    // Get WebGL2 context
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;
    this.instanceData = new Float32Array(this.maxInstances * this.instanceStride);

    // Initialize
    this.initShaders();
    this.initBuffers();
    this.initAtlas();
    this.initFramebuffer();

    // Set up GL state
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 1);
  }

  private initShaders(): void {
    // Main shader program
    this.mainProgram = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);

    // Post-processing program
    this.postProgram = this.createProgram(POST_VERTEX, POST_FRAGMENT);
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl;

    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, vertSrc);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      throw new Error('Vertex shader error: ' + gl.getShaderInfoLog(vertShader));
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, fragSrc);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      throw new Error('Fragment shader error: ' + gl.getShaderInfoLog(fragShader));
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }

    return program;
  }

  private initBuffers(): void {
    const gl = this.gl;

    // Quad vertices (two triangles)
    const quadVerts = new Float32Array([
      // position    // texcoord
      -0.5, -0.5,    0.0, 1.0,
       0.5, -0.5,    1.0, 1.0,
       0.5,  0.5,    1.0, 0.0,
      -0.5, -0.5,    0.0, 1.0,
       0.5,  0.5,    1.0, 0.0,
      -0.5,  0.5,    0.0, 0.0,
    ]);

    // Create VAO for instanced quads
    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);

    // Quad vertex buffer
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // a_position (location 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // a_texCoord (location 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    // Instance buffer
    this.instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);

    const stride = this.instanceStride * 4; // bytes

    // a_worldPos (location 2) - vec3
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(2, 1);

    // a_charUV (location 3) - vec2
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(3, 1);

    // a_color (location 4) - vec4
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 20);
    gl.vertexAttribDivisor(4, 1);

    // a_scale (location 5) - float
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, 36);
    gl.vertexAttribDivisor(5, 1);

    // a_glow (location 6) - float
    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, stride, 40);
    gl.vertexAttribDivisor(6, 1);

    // a_rotation (location 7) - float
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 1, gl.FLOAT, false, stride, 44);
    gl.vertexAttribDivisor(7, 1);

    gl.bindVertexArray(null);

    // Post-processing quad VAO
    const postVerts = new Float32Array([
      -1, -1,  1, -1,  1, 1,
      -1, -1,  1,  1, -1, 1,
    ]);

    this.postVAO = gl.createVertexArray();
    gl.bindVertexArray(this.postVAO);

    const postBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, postBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, postVerts, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }

  private initAtlas(): void {
    const gl = this.gl;

    // Create offscreen canvas for atlas
    const rows = Math.ceil(ATLAS_CHARS.length / ATLAS_COLS);
    const atlasWidth = ATLAS_COLS * ATLAS_CHAR_SIZE;
    const atlasHeight = rows * ATLAS_CHAR_SIZE;

    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasWidth;
    atlasCanvas.height = atlasHeight;
    const ctx = atlasCanvas.getContext('2d')!;

    // Clear to black with transparency
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, atlasWidth, atlasHeight);

    // Draw characters
    ctx.fillStyle = '#ffffff';
    ctx.font = `${ATLAS_CHAR_SIZE - 4}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let i = 0; i < ATLAS_CHARS.length; i++) {
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      const x = col * ATLAS_CHAR_SIZE + ATLAS_CHAR_SIZE / 2;
      const y = row * ATLAS_CHAR_SIZE + ATLAS_CHAR_SIZE / 2;

      ctx.fillText(ATLAS_CHARS[i], x, y);

      // Store UV coordinates
      this.charMap.set(ATLAS_CHARS[i], [
        col / ATLAS_COLS,
        row / rows,
      ]);
    }

    // Create texture
    this.atlasTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private initFramebuffer(): void {
    const gl = this.gl;
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    // Scene texture
    this.sceneTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Depth buffer
    const depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    // Framebuffer
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.sceneTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** Set camera position and direction */
  setCamera(pos: Vec2, dir: Vec2): void {
    this.cameraPos = [pos.x, 0.5, pos.y]; // Y is up
    this.cameraDir = [dir.x, 0, dir.y];

    // Calculate right vector (cross product with up)
    this.cameraRight = [dir.y, 0, -dir.x];
    this.cameraUp = [0, 1, 0];
  }

  /** Clear all instances */
  clearInstances(): void {
    this.instances = [];
  }

  /** Add a character instance */
  addChar(instance: CharInstance): void {
    if (this.instances.length < this.maxInstances) {
      this.instances.push(instance);
    }
  }

  /** Add multiple characters (for convenience) */
  addString(
    text: string,
    x: number, y: number, z: number,
    color: [number, number, number, number],
    scale: number = 0.1,
    glow: number = 0
  ): void {
    for (let i = 0; i < text.length; i++) {
      this.addChar({
        x: x + i * scale * 0.6,
        y,
        z,
        char: text[i],
        color,
        scale,
        glow,
        rotation: 0,
      });
    }
  }

  /** Update post-processing settings */
  setPostProcess(settings: Partial<PostProcessSettings>): void {
    Object.assign(this.postProcess, settings);
  }

  /** Update animation time */
  updateTime(deltaTime: number): void {
    this.time += deltaTime;
  }

  /** Render all instances */
  render(): void {
    const gl = this.gl;

    // Update instance buffer
    this.updateInstanceBuffer();

    // Calculate view-projection matrix
    const viewProj = this.calculateViewProjMatrix();

    // Render to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw instances
    gl.useProgram(this.mainProgram);
    gl.bindVertexArray(this.quadVAO);

    // Set uniforms
    const rows = Math.ceil(ATLAS_CHARS.length / ATLAS_COLS);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.mainProgram!, 'u_viewProj'), false, viewProj);
    gl.uniform3fv(gl.getUniformLocation(this.mainProgram!, 'u_cameraPos'), this.cameraPos);
    gl.uniform3fv(gl.getUniformLocation(this.mainProgram!, 'u_cameraRight'), this.cameraRight);
    gl.uniform3fv(gl.getUniformLocation(this.mainProgram!, 'u_cameraUp'), this.cameraUp);
    gl.uniform2f(gl.getUniformLocation(this.mainProgram!, 'u_charSize'), 1 / ATLAS_COLS, 1 / rows);
    gl.uniform1f(gl.getUniformLocation(this.mainProgram!, 'u_time'), this.time);

    // Bind atlas texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.uniform1i(gl.getUniformLocation(this.mainProgram!, 'u_atlas'), 0);

    // Draw instanced
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instances.length);

    // Post-processing pass
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.postProgram);
    gl.bindVertexArray(this.postVAO);

    // Post-process uniforms
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.uniform1i(gl.getUniformLocation(this.postProgram!, 'u_scene'), 0);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_time'), this.time);
    gl.uniform2f(gl.getUniformLocation(this.postProgram!, 'u_resolution'), gl.canvas.width, gl.canvas.height);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_bloomIntensity'), this.postProcess.bloomIntensity);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_scanlineIntensity'), this.postProcess.scanlineIntensity);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_vignetteIntensity'), this.postProcess.vignetteIntensity);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_chromaticAberration'), this.postProcess.chromaticAberration);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_screenShake'), this.postProcess.screenShake);
    gl.uniform3fv(gl.getUniformLocation(this.postProgram!, 'u_damageFlash'), this.postProcess.damageFlash);
    gl.uniform1f(gl.getUniformLocation(this.postProgram!, 'u_crtCurvature'), this.postProcess.crtCurvature);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
  }

  private updateInstanceBuffer(): void {
    const gl = this.gl;

    for (let i = 0; i < this.instances.length; i++) {
      const inst = this.instances[i];
      const offset = i * this.instanceStride;

      // Get UV for character
      let uv = this.charMap.get(inst.char);
      if (!uv) {
        uv = this.charMap.get(' ') || [0, 0];
      }

      // Pack instance data
      this.instanceData[offset + 0] = inst.x;
      this.instanceData[offset + 1] = inst.y;
      this.instanceData[offset + 2] = inst.z;
      this.instanceData[offset + 3] = uv[0];
      this.instanceData[offset + 4] = uv[1];
      this.instanceData[offset + 5] = inst.color[0];
      this.instanceData[offset + 6] = inst.color[1];
      this.instanceData[offset + 7] = inst.color[2];
      this.instanceData[offset + 8] = inst.color[3];
      this.instanceData[offset + 9] = inst.scale;
      this.instanceData[offset + 10] = inst.glow;
      this.instanceData[offset + 11] = inst.rotation;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, this.instances.length * this.instanceStride));
  }

  private calculateViewProjMatrix(): Float32Array {
    const fov = Math.PI / 3; // 60 degrees
    const aspect = this.gl.canvas.width / this.gl.canvas.height;
    const near = 0.1;
    const far = 100;

    // Perspective projection matrix
    const f = 1 / Math.tan(fov / 2);
    const proj = new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0,
    ]);

    // View matrix (look at)
    const cx = this.cameraPos[0];
    const cy = this.cameraPos[1];
    const cz = this.cameraPos[2];
    const tx = cx + this.cameraDir[0];
    const ty = cy + this.cameraDir[1];
    const tz = cz + this.cameraDir[2];

    // Forward vector
    let fx = tx - cx, fy = ty - cy, fz = tz - cz;
    const fl = Math.sqrt(fx * fx + fy * fy + fz * fz);
    fx /= fl; fy /= fl; fz /= fl;

    // Right vector (cross up with forward)
    const ux = 0, uy = 1, uz = 0; // Up
    let rx = uy * fz - uz * fy;
    let ry = uz * fx - ux * fz;
    let rz = ux * fy - uy * fx;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz);
    rx /= rl; ry /= rl; rz /= rl;

    // Recalculate up (cross forward with right)
    const nux = fy * rz - fz * ry;
    const nuy = fz * rx - fx * rz;
    const nuz = fx * ry - fy * rx;

    const view = new Float32Array([
      rx, nux, -fx, 0,
      ry, nuy, -fy, 0,
      rz, nuz, -fz, 0,
      -(rx * cx + ry * cy + rz * cz),
      -(nux * cx + nuy * cy + nuz * cz),
      (fx * cx + fy * cy + fz * cz),
      1,
    ]);

    // Multiply proj * view
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += proj[k * 4 + j] * view[i * 4 + k];
        }
      }
    }

    return result;
  }

  /** Get character UV for external use */
  getCharUV(char: string): [number, number] | undefined {
    return this.charMap.get(char);
  }

  /** Resize handler */
  resize(width: number, height: number): void {
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;
    this.initFramebuffer();
  }
}

/** Parse hex color to RGBA array */
export function hexToRGBA(hex: string, alpha: number = 1): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, alpha];
}
