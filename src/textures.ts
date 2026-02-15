/**
 * Texture system for ASCII wall rendering
 * Each texture is a 16x64 grid of ASCII characters with colour info
 */

export interface TextureColumn {
  chars: string[];      // 64 characters for this column
  colours: string[];    // Corresponding colours
}

export interface Texture {
  width: number;
  height: number;
  columns: TextureColumn[];
}

// ASCII characters ordered by visual density (dark to light)
const DENSITY_RAMP = '█▓▒░#%&@$*+=;:,. ';

/**
 * Sample a single character from a texture
 * @param texture The texture to sample
 * @param u Horizontal position (0-1, where on wall)
 * @param v Vertical position (0-1, top to bottom)
 * @param brightness Light level (0-1)
 */
export function sampleTexture(
  texture: Texture,
  u: number,
  v: number,
  brightness: number
): { char: string; colour: string } {
  // Wrap u to handle edge cases
  const texX = Math.floor((u % 1) * texture.width) % texture.width;
  const texY = Math.floor((v % 1) * texture.height) % texture.height;

  const column = texture.columns[texX];
  const baseChar = column.chars[texY];
  const baseColour = column.colours[texY];

  // Adjust character based on brightness (distance fade)
  const charIndex = DENSITY_RAMP.indexOf(baseChar);
  if (charIndex >= 0) {
    // Shift towards lighter characters as brightness decreases
    const fadeAmount = Math.floor((1 - brightness) * 6);
    const newIndex = Math.min(charIndex + fadeAmount, DENSITY_RAMP.length - 1);
    return { char: DENSITY_RAMP[newIndex], colour: baseColour };
  }

  return { char: baseChar, colour: baseColour };
}

/**
 * Create a procedural stone block texture
 */
function createStoneTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Create stone block pattern with mortar lines
      const blockY = y % 16;
      const offset = Math.floor(y / 16) % 2 === 0 ? 0 : 4;
      const actualBlockX = (x + offset) % 8;

      // Mortar lines
      if (blockY === 0 || actualBlockX === 0) {
        chars.push('░');
        colours.push('#444444');
      } else {
        // Stone surface with variation
        const noise = ((x * 7 + y * 13) % 5);
        if (noise < 2) {
          chars.push('█');
        } else if (noise < 4) {
          chars.push('▓');
        } else {
          chars.push('▒');
        }
        colours.push('#888888');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a red brick texture
 */
function createBrickTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const blockY = y % 8;
      const offset = Math.floor(y / 8) % 2 === 0 ? 0 : 8;
      const blockX = (x + offset) % 16;

      // Mortar lines (horizontal every 8, vertical every 16 with offset)
      if (blockY === 0 || blockX === 0) {
        chars.push('░');
        colours.push('#666655');
      } else {
        // Brick surface
        const noise = ((x * 11 + y * 7) % 4);
        if (noise < 2) {
          chars.push('▓');
        } else {
          chars.push('▒');
        }
        colours.push('#cc4444');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a blue tech panel texture
 */
function createTechPanelTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const panelX = x % 16;
      const panelY = y % 32;

      // Panel border
      if (panelX === 0 || panelX === 15 || panelY === 0 || panelY === 31) {
        chars.push('█');
        colours.push('#003366');
      }
      // Horizontal lines (tech detail)
      else if (panelY % 8 === 4) {
        chars.push('═');
        colours.push('#0088ff');
      }
      // Vertical accent
      else if (panelX === 8) {
        chars.push('│');
        colours.push('#0066cc');
      }
      // Panel interior
      else {
        chars.push('▒');
        colours.push('#004488');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create yellow warning stripe texture
 */
function createWarningTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Diagonal stripes
      const stripe = (x + y) % 16;

      if (stripe < 8) {
        chars.push('█');
        colours.push('#ffcc00');
      } else {
        chars.push('█');
        colours.push('#222222');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create purple organic flesh texture (Doom-style)
 */
function createFleshTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Organic, lumpy pattern
      const noise = Math.sin(x * 0.8) * Math.cos(y * 0.3) +
                    Math.sin((x + y) * 0.5) * 0.5;

      if (noise > 0.3) {
        chars.push('█');
        colours.push('#993399');
      } else if (noise > 0) {
        chars.push('▓');
        colours.push('#772277');
      } else if (noise > -0.3) {
        chars.push('▒');
        colours.push('#661166');
      } else {
        chars.push('░');
        colours.push('#550055');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create cyan circuit board texture
 */
function createCircuitTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const gridX = x % 8;
      const gridY = y % 8;

      // Circuit traces
      if (gridX === 0 || gridY === 0) {
        chars.push('─');
        colours.push('#00ffff');
      }
      // Junction points
      else if (gridX === 4 && gridY === 4) {
        chars.push('●');
        colours.push('#00ffcc');
      }
      // Chip patterns
      else if ((x + y) % 7 === 0) {
        chars.push('▪');
        colours.push('#008888');
      }
      // Background
      else {
        chars.push('░');
        colours.push('#004444');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create lava texture with flowing animation support
 */
function createLavaTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Flowing lava pattern
      const flow = Math.sin(x * 0.5 + y * 0.2) * Math.cos(y * 0.3);
      const bubble = Math.sin(x * 1.2) * Math.sin(y * 0.8);

      if (flow + bubble > 0.5) {
        chars.push('█');
        colours.push('#ff6600');
      } else if (flow + bubble > 0) {
        chars.push('▓');
        colours.push('#ff4400');
      } else if (flow + bubble > -0.5) {
        chars.push('▒');
        colours.push('#cc2200');
      } else {
        chars.push('░');
        colours.push('#880000');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create toxic slime texture
 */
function createSlimeTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Bubbling slime pattern
      const drip = Math.sin(x * 0.3) + Math.cos(y * 0.15);
      const bubble = ((x * 7 + y * 11) % 13) < 2;

      if (bubble) {
        chars.push('○');
        colours.push('#88ff88');
      } else if (drip > 0.5) {
        chars.push('█');
        colours.push('#44cc44');
      } else if (drip > 0) {
        chars.push('▓');
        colours.push('#33aa33');
      } else if (drip > -0.5) {
        chars.push('▒');
        colours.push('#228822');
      } else {
        chars.push('░');
        colours.push('#116611');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create metal grate texture
 */
function createMetalGrateTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const gridX = x % 4;
      const gridY = y % 4;

      // Grid pattern
      if (gridX === 0 || gridY === 0) {
        chars.push('█');
        colours.push('#666666');
      } else {
        // Holes in the grate
        chars.push('░');
        colours.push('#222222');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create blood-soaked wall texture
 */
function createBloodWallTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Dripping blood pattern - more blood at top, drips down
      const drip = Math.sin(x * 0.8) * (1 - y / height) + Math.random() * 0.2;

      if (drip > 0.4) {
        chars.push('█');
        colours.push('#880000');
      } else if (drip > 0.2) {
        chars.push('▓');
        colours.push('#660000');
      } else if (drip > 0) {
        chars.push('▒');
        colours.push('#550000');
      } else {
        // Base wall
        const noise = ((x * 7 + y * 13) % 5);
        if (noise < 2) {
          chars.push('▓');
        } else {
          chars.push('▒');
        }
        colours.push('#444444');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create pulsing flesh wall texture (Doom-style hell)
 */
function createPulsingFleshTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Organic veins and pulsing pattern
      const veinX = Math.sin(x * 0.4 + y * 0.1);
      const veinY = Math.cos(y * 0.3 + x * 0.15);
      const pulse = veinX * veinY;

      // Vein pattern
      if (Math.abs(veinX) < 0.2 || Math.abs(veinY) < 0.2) {
        chars.push('█');
        colours.push('#cc00cc');  // Bright purple veins
      } else if (pulse > 0.3) {
        chars.push('▓');
        colours.push('#882288');
      } else if (pulse > 0) {
        chars.push('▒');
        colours.push('#661166');
      } else {
        chars.push('░');
        colours.push('#440044');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create tech conduit texture with glowing pipes
 */
function createTechConduitTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const pipeX = x % 8;
      const pipeY = y % 16;

      // Pipe structure
      if (pipeX === 0 || pipeX === 7) {
        chars.push('║');
        colours.push('#446688');
      } else if (pipeY === 0 || pipeY === 15) {
        chars.push('═');
        colours.push('#446688');
      }
      // Glowing energy in pipe
      else if (pipeX >= 2 && pipeX <= 5 && pipeY >= 4 && pipeY <= 11) {
        const glow = ((y + x) % 4);
        if (glow === 0) {
          chars.push('█');
          colours.push('#00ffff');
        } else if (glow === 1) {
          chars.push('▓');
          colours.push('#00cccc');
        } else {
          chars.push('▒');
          colours.push('#009999');
        }
      }
      // Pipe interior
      else {
        chars.push('░');
        colours.push('#223344');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a stone floor texture
 */
function createFloorTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Tile pattern with grout lines
      const tileX = x % 8;
      const tileY = y % 8;

      if (tileX === 0 || tileY === 0) {
        chars.push('░');
        colours.push('#222222');
      } else {
        const noise = ((x * 17 + y * 23) % 7);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#444444');
        } else if (noise < 4) {
          chars.push('▒');
          colours.push('#3a3a3a');
        } else {
          chars.push('░');
          colours.push('#333333');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a hell floor texture (red/orange cracks)
 */
function createHellFloorTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Cracked floor with lava showing through
      const crack = Math.sin(x * 0.7 + y * 0.3) * Math.cos(x * 0.4 - y * 0.6);

      if (crack > 0.6) {
        chars.push('█');
        colours.push('#ff4400'); // Lava glow
      } else if (crack > 0.3) {
        chars.push('▓');
        colours.push('#882200');
      } else {
        const noise = ((x * 13 + y * 19) % 5);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#332222');
        } else {
          chars.push('▒');
          colours.push('#2a1a1a');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a starfield ceiling texture
 */
function createStarCeilingTexture(): Texture {
  const width = 32;
  const height = 32;
  const columns: TextureColumn[] = [];

  // Pre-generate star positions
  const stars: Set<string> = new Set();
  const prng = (n: number) => ((n * 1103515245 + 12345) & 0x7fffffff) % 100;

  for (let i = 0; i < 40; i++) {
    const sx = prng(i * 7) % width;
    const sy = prng(i * 13 + 50) % height;
    stars.add(`${sx},${sy}`);
  }

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      if (stars.has(`${x},${y}`)) {
        const brightness = prng(x * 11 + y * 17);
        if (brightness < 30) {
          chars.push('★');
          colours.push('#ffffff');
        } else if (brightness < 60) {
          chars.push('✦');
          colours.push('#aaaaff');
        } else {
          chars.push('·');
          colours.push('#8888aa');
        }
      } else {
        chars.push(' ');
        colours.push('#0a0a15');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a hell ceiling texture (fiery clouds)
 */
function createHellCeilingTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Fiery cloud pattern
      const cloud = Math.sin(x * 0.5) * Math.cos(y * 0.5) +
                    Math.sin((x + y) * 0.3) * 0.5;

      if (cloud > 0.5) {
        chars.push('█');
        colours.push('#ff6600');
      } else if (cloud > 0.2) {
        chars.push('▓');
        colours.push('#cc4400');
      } else if (cloud > -0.2) {
        chars.push('▒');
        colours.push('#882200');
      } else {
        chars.push('░');
        colours.push('#441100');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Create a tech floor texture (metal plates)
 */
function createTechFloorTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const plateX = x % 8;
      const plateY = y % 8;

      // Plate edges
      if (plateX === 0 || plateY === 0) {
        chars.push('─');
        colours.push('#555566');
      } else if (plateX === 7 || plateY === 7) {
        chars.push('─');
        colours.push('#333344');
      }
      // Rivets at corners
      else if ((plateX === 1 || plateX === 6) && (plateY === 1 || plateY === 6)) {
        chars.push('●');
        colours.push('#666677');
      }
      // Plate surface
      else {
        const noise = ((x * 11 + y * 7) % 4);
        if (noise === 0) {
          chars.push('▓');
          colours.push('#445566');
        } else {
          chars.push('▒');
          colours.push('#3a4a5a');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

// Pre-generate all textures
const TEXTURES: Record<number, Texture> = {
  1: createStoneTexture(),
  2: createBrickTexture(),
  3: createTechPanelTexture(),
  4: createWarningTexture(),
  5: createFleshTexture(),
  6: createCircuitTexture(),
  7: createLavaTexture(),
  8: createSlimeTexture(),
  9: createMetalGrateTexture(),
  10: createBloodWallTexture(),
  11: createPulsingFleshTexture(),
  12: createTechConduitTexture(),
};

// Floor and ceiling textures
const FLOOR_TEXTURE = createFloorTexture();
const HELL_FLOOR_TEXTURE = createHellFloorTexture();
const TECH_FLOOR_TEXTURE = createTechFloorTexture();
const STAR_CEILING_TEXTURE = createStarCeilingTexture();
const HELL_CEILING_TEXTURE = createHellCeilingTexture();

/**
 * Get texture for a wall type
 */
export function getTexture(wallType: number): Texture {
  return TEXTURES[wallType] || TEXTURES[1];
}

/**
 * Sample texture for a wall strip
 * @param wallType Wall type (1-6)
 * @param wallX Where ray hit wall (0-1)
 * @param startV Starting V coordinate for this strip
 * @param endV Ending V coordinate for this strip
 * @param height Number of characters to sample
 * @param distance Distance for brightness calculation
 */
export function sampleWallStrip(
  wallType: number,
  wallX: number,
  startV: number,
  endV: number,
  height: number,
  distance: number
): Array<{ char: string; colour: string }> {
  const texture = getTexture(wallType);
  const result: Array<{ char: string; colour: string }> = [];

  // Calculate brightness based on distance
  const maxDist = 16;
  const brightness = Math.max(0.2, 1 - (distance / maxDist));

  for (let i = 0; i < height; i++) {
    const v = startV + (endV - startV) * (i / height);
    result.push(sampleTexture(texture, wallX, v, brightness));
  }

  return result;
}

/**
 * Sample floor texture at world coordinates
 * @param worldX World X position
 * @param worldY World Y position
 * @param distance Distance for brightness calculation
 * @param floorType 0 = normal, 1 = hell, 2 = tech
 */
export function sampleFloorTexture(
  worldX: number,
  worldY: number,
  distance: number,
  floorType: number = 0
): { char: string; colour: string } {
  const texture = floorType === 1 ? HELL_FLOOR_TEXTURE :
                  floorType === 2 ? TECH_FLOOR_TEXTURE :
                  FLOOR_TEXTURE;

  // Scale world coords to texture coords (tile every 1 unit)
  const u = worldX - Math.floor(worldX);
  const v = worldY - Math.floor(worldY);

  // Calculate brightness based on distance
  const maxDist = 12;
  const brightness = Math.max(0.15, 1 - (distance / maxDist));

  return sampleTexture(texture, u, v, brightness);
}

/**
 * Sample ceiling texture at world coordinates with animation
 * @param worldX World X position
 * @param worldY World Y position
 * @param distance Distance for brightness calculation
 * @param ceilingType 0 = stars, 1 = hell
 * @param animTime Current animation time for scrolling effect
 */
export function sampleCeilingTexture(
  worldX: number,
  worldY: number,
  distance: number,
  ceilingType: number = 0,
  animTime: number = 0
): { char: string; colour: string } {
  const texture = ceilingType === 1 ? HELL_CEILING_TEXTURE : STAR_CEILING_TEXTURE;

  // Scale for ceiling (larger tiles)
  const scale = ceilingType === 0 ? 0.5 : 1.0;

  // Apply scrolling animation
  const scrollSpeed = ceilingType === 0 ? 0.02 : 0.05;
  const animOffsetX = animTime * scrollSpeed;
  const animOffsetY = animTime * scrollSpeed * 0.7;

  const u = ((worldX + animOffsetX) * scale) % 1;
  const v = ((worldY + animOffsetY) * scale) % 1;

  // Ceiling is a bit darker
  const maxDist = 10;
  const brightness = Math.max(0.1, 0.8 - (distance / maxDist));

  // Add twinkling effect for stars
  if (ceilingType === 0) {
    const twinkle = Math.sin(animTime * 3 + worldX * 10 + worldY * 7) * 0.15;
    const sample = sampleTexture(texture, u < 0 ? u + 1 : u, v < 0 ? v + 1 : v, brightness + twinkle);
    return sample;
  }

  return sampleTexture(texture, u < 0 ? u + 1 : u, v < 0 ? v + 1 : v, brightness);
}
