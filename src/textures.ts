/**
 * Texture system for ASCII wall rendering
 * Visual theme: THE FINALS — modern urban construction, game-show aesthetic
 * Warm oranges/golds, clean concrete, glass, steel, neon
 *
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
 * 1. Clean concrete wall — modern poured concrete with form lines
 */
function createConcreteTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      // Horizontal form lines every 16 rows
      const formLine = y % 16;
      if (formLine === 0) {
        chars.push('─');
        colours.push('#8a8070');
      } else {
        // Concrete surface with subtle variation
        const noise = ((x * 7 + y * 13) % 7);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#b0a898');
        } else if (noise < 4) {
          chars.push('▒');
          colours.push('#a89888');
        } else if (noise < 6) {
          chars.push('▓');
          colours.push('#a09080');
        } else {
          chars.push('▒');
          colours.push('#988878');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 2. Modern brick — clean orange/tan brick with neat mortar
 */
function createModernBrickTexture(): Texture {
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

      // Mortar lines
      if (blockY === 0 || blockX === 0) {
        chars.push('░');
        colours.push('#c8b898');
      } else {
        // Warm brick surface
        const noise = ((x * 11 + y * 7) % 5);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#cc8855');
        } else if (noise < 4) {
          chars.push('▒');
          colours.push('#bb7744');
        } else {
          chars.push('▓');
          colours.push('#d49060');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 3. Glass panel — reflective modern glass curtain wall
 */
function createGlassPanelTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const panelX = x % 16;
      const panelY = y % 32;

      // Aluminium frame
      if (panelX === 0 || panelX === 15 || panelY === 0 || panelY === 31) {
        chars.push('█');
        colours.push('#8899aa');
      }
      // Horizontal mullion
      else if (panelY === 16) {
        chars.push('═');
        colours.push('#7788aa');
      }
      // Glass reflection streaks
      else if ((panelX + panelY) % 12 === 0) {
        chars.push('▒');
        colours.push('#88ccdd');
      }
      // Glass surface
      else {
        const tint = ((x + y) % 3);
        if (tint === 0) {
          chars.push('░');
          colours.push('#4488aa');
        } else if (tint === 1) {
          chars.push('░');
          colours.push('#3d7a99');
        } else {
          chars.push('░');
          colours.push('#5599bb');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 4. Construction barrier — orange/white hazard stripes
 */
function createBarrierTexture(): Texture {
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
        colours.push('#ff8800');
      } else {
        chars.push('█');
        colours.push('#f0e8dd');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 5. Damaged drywall — crumbling interior wall with exposed structure
 */
function createDrywallTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const damage = Math.sin(x * 0.8) * Math.cos(y * 0.3) +
                     Math.sin((x + y) * 0.5) * 0.5;

      if (damage > 0.3) {
        // Exposed structure/studs
        chars.push('║');
        colours.push('#aa8855');
      } else if (damage > 0) {
        chars.push('▓');
        colours.push('#ccbbaa');
      } else if (damage > -0.3) {
        chars.push('▒');
        colours.push('#ddccbb');
      } else {
        // Clean drywall
        chars.push('░');
        colours.push('#e8ddd0');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 6. LED display / digital billboard — neon accents on dark panel
 */
function createLEDDisplayTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const gridX = x % 8;
      const gridY = y % 8;

      // LED grid lines
      if (gridX === 0 || gridY === 0) {
        chars.push('─');
        colours.push('#ff8800');
      }
      // Bright LED pixels
      else if (gridX === 4 && gridY === 4) {
        chars.push('●');
        colours.push('#ffaa00');
      }
      // Active pixels
      else if ((x + y) % 7 === 0) {
        chars.push('▪');
        colours.push('#ffcc44');
      }
      // Dark panel background
      else {
        chars.push('░');
        colours.push('#2a2520');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 7. Exposed steel girders — structural steel I-beams
 */
function createSteelGirderTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const beamX = x % 8;
      const beamY = y % 16;

      // I-beam flanges
      if (beamY < 2 || beamY > 13) {
        chars.push('█');
        colours.push('#8a7a6a');
      }
      // I-beam web
      else if (beamX >= 3 && beamX <= 4) {
        chars.push('║');
        colours.push('#7a6a5a');
      }
      // Rivet
      else if (beamX === 3 && beamY === 8) {
        chars.push('●');
        colours.push('#998877');
      }
      // Behind the beam
      else {
        chars.push('░');
        colours.push('#332a22');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 8. Tiled bathroom/interior — clean white/cream tile
 */
function createTileTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const tileX = x % 8;
      const tileY = y % 8;

      // Grout lines
      if (tileX === 0 || tileY === 0) {
        chars.push('░');
        colours.push('#999088');
      }
      // Tile surface
      else {
        const shine = ((x * 3 + y * 7) % 5);
        if (shine === 0) {
          chars.push('▓');
          colours.push('#f0e8dd');
        } else if (shine < 3) {
          chars.push('▒');
          colours.push('#e8ddd2');
        } else {
          chars.push('▓');
          colours.push('#ece2d8');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 9. Steel mesh scaffolding — construction site scaffolding
 */
function createScaffoldingTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const gridX = x % 4;
      const gridY = y % 4;

      // Steel mesh
      if (gridX === 0 || gridY === 0) {
        chars.push('█');
        colours.push('#888078');
      } else {
        // Gaps in mesh
        chars.push('░');
        colours.push('#4a4038');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 10. Rubble wall — destroyed building debris
 */
function createRubbleTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const debris = Math.sin(x * 0.8) * (1 - y / height) + Math.random() * 0.2;

      if (debris > 0.4) {
        chars.push('█');
        colours.push('#8a7a68');
      } else if (debris > 0.2) {
        chars.push('▓');
        colours.push('#7a6a58');
      } else if (debris > 0) {
        chars.push('▒');
        colours.push('#6a5a48');
      } else {
        // Exposed rebar/structure
        const noise = ((x * 7 + y * 13) % 5);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#665544');
        } else {
          chars.push('▒');
          colours.push('#554433');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 11. Neon billboard — glowing game show advertisement
 */
function createNeonBillboardTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const panelX = x % 16;
      const panelY = y % 32;

      // Neon border
      if (panelX === 0 || panelX === 15 || panelY === 0 || panelY === 31) {
        chars.push('█');
        colours.push('#ff6600');
      }
      // Neon tube patterns (horizontal)
      else if (panelY % 8 === 4) {
        const glow = ((x + y) % 3);
        if (glow === 0) {
          chars.push('═');
          colours.push('#ffaa00');
        } else {
          chars.push('═');
          colours.push('#ff8800');
        }
      }
      // Vertical neon accent
      else if (panelX === 8) {
        chars.push('│');
        colours.push('#ffcc44');
      }
      // Dark backing
      else {
        chars.push('▒');
        colours.push('#1a1510');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * 12. Pipe conduit — industrial HVAC/plumbing runs
 */
function createPipeConduitTexture(): Texture {
  const width = 16;
  const height = 64;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const pipeX = x % 8;
      const pipeY = y % 16;

      // Pipe walls
      if (pipeX === 0 || pipeX === 7) {
        chars.push('║');
        colours.push('#88776a');
      } else if (pipeY === 0 || pipeY === 15) {
        chars.push('═');
        colours.push('#88776a');
      }
      // Pipe interior — warm light from inside
      else if (pipeX >= 2 && pipeX <= 5 && pipeY >= 4 && pipeY <= 11) {
        const glow = ((y + x) % 4);
        if (glow === 0) {
          chars.push('█');
          colours.push('#ffaa44');
        } else if (glow === 1) {
          chars.push('▓');
          colours.push('#dd8833');
        } else {
          chars.push('▒');
          colours.push('#bb6622');
        }
      }
      // Pipe exterior
      else {
        chars.push('░');
        colours.push('#443830');
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

// ─── Floor Textures ────────────────────────────────────────────

/**
 * Standard floor — polished concrete
 */
function createConcreteFloorTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const tileX = x % 8;
      const tileY = y % 8;

      // Expansion joints
      if (tileX === 0 || tileY === 0) {
        chars.push('░');
        colours.push('#3a3530');
      } else {
        const noise = ((x * 17 + y * 23) % 7);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#5a5248');
        } else if (noise < 4) {
          chars.push('▒');
          colours.push('#524a40');
        } else {
          chars.push('░');
          colours.push('#4a4238');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Rubble floor — debris-covered ground
 */
function createRubbleFloorTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const crack = Math.sin(x * 0.7 + y * 0.3) * Math.cos(x * 0.4 - y * 0.6);

      if (crack > 0.6) {
        chars.push('█');
        colours.push('#aa8855');
      } else if (crack > 0.3) {
        chars.push('▓');
        colours.push('#7a6a55');
      } else {
        const noise = ((x * 13 + y * 19) % 5);
        if (noise < 2) {
          chars.push('▓');
          colours.push('#4a4035');
        } else {
          chars.push('▒');
          colours.push('#3a3228');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Metal floor — diamond plate / industrial
 */
function createMetalFloorTexture(): Texture {
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
        colours.push('#6a6258');
      } else if (plateX === 7 || plateY === 7) {
        chars.push('─');
        colours.push('#4a4238');
      }
      // Diamond plate pattern
      else if ((plateX + plateY) % 3 === 0) {
        chars.push('◆');
        colours.push('#7a7268');
      }
      // Plate surface
      else {
        const noise = ((x * 11 + y * 7) % 4);
        if (noise === 0) {
          chars.push('▓');
          colours.push('#6a6258');
        } else {
          chars.push('▒');
          colours.push('#5a5248');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

// ─── Ceiling Textures ────────────────────────────────────────────

/**
 * Open sky ceiling — bright daytime sky
 */
function createSkyCeilingTexture(): Texture {
  const width = 32;
  const height = 32;
  const columns: TextureColumn[] = [];

  // Pre-generate cloud positions
  const clouds: Set<string> = new Set();
  const prng = (n: number) => ((n * 1103515245 + 12345) & 0x7fffffff) % 100;

  for (let i = 0; i < 50; i++) {
    const sx = prng(i * 7) % width;
    const sy = prng(i * 13 + 50) % height;
    clouds.add(`${sx},${sy}`);
    // Clouds are wider than stars
    clouds.add(`${(sx + 1) % width},${sy}`);
    if (i % 3 === 0) clouds.add(`${(sx + 2) % width},${sy}`);
  }

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      if (clouds.has(`${x},${y}`)) {
        const brightness = prng(x * 11 + y * 17);
        if (brightness < 40) {
          chars.push('█');
          colours.push('#e8e0d8');
        } else if (brightness < 70) {
          chars.push('▓');
          colours.push('#d8d0c8');
        } else {
          chars.push('▒');
          colours.push('#c8c0b8');
        }
      } else {
        // Sky gradient
        const depth = y / height;
        if (depth < 0.3) {
          chars.push(' ');
          colours.push('#5588cc');
        } else if (depth < 0.6) {
          chars.push(' ');
          colours.push('#6699cc');
        } else {
          chars.push(' ');
          colours.push('#88aacc');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

/**
 * Indoor ceiling — exposed concrete with light fixtures
 */
function createIndoorCeilingTexture(): Texture {
  const width = 16;
  const height = 16;
  const columns: TextureColumn[] = [];

  for (let x = 0; x < width; x++) {
    const chars: string[] = [];
    const colours: string[] = [];

    for (let y = 0; y < height; y++) {
      const gridX = x % 8;
      const gridY = y % 8;

      // Light fixture
      if (gridX >= 3 && gridX <= 4 && gridY >= 3 && gridY <= 4) {
        chars.push('█');
        colours.push('#ffdd88');
      }
      // Ceiling grid/T-bar
      else if (gridX === 0 || gridY === 0) {
        chars.push('─');
        colours.push('#7a7068');
      }
      // Ceiling tile
      else {
        const noise = ((x * 5 + y * 11) % 4);
        if (noise === 0) {
          chars.push('▒');
          colours.push('#8a8078');
        } else {
          chars.push('░');
          colours.push('#7a7068');
        }
      }
    }

    columns.push({ chars, colours });
  }

  return { width, height, columns };
}

// Pre-generate all textures
const TEXTURES: Record<number, Texture> = {
  1: createConcreteTexture(),         // Clean concrete
  2: createModernBrickTexture(),      // Warm modern brick
  3: createGlassPanelTexture(),       // Glass curtain wall
  4: createBarrierTexture(),          // Construction barrier (orange/white)
  5: createDrywallTexture(),          // Damaged drywall
  6: createLEDDisplayTexture(),       // LED display/billboard
  7: createSteelGirderTexture(),      // Exposed steel structure
  8: createTileTexture(),             // Clean interior tile
  9: createScaffoldingTexture(),      // Steel mesh scaffolding
  10: createRubbleTexture(),          // Rubble/debris
  11: createNeonBillboardTexture(),   // Neon game-show billboard
  12: createPipeConduitTexture(),     // Industrial pipe runs
};

// Floor and ceiling textures
const FLOOR_TEXTURE = createConcreteFloorTexture();
const HELL_FLOOR_TEXTURE = createRubbleFloorTexture();
const TECH_FLOOR_TEXTURE = createMetalFloorTexture();
const STAR_CEILING_TEXTURE = createSkyCeilingTexture();
const HELL_CEILING_TEXTURE = createIndoorCeilingTexture();

/**
 * Get texture for a wall type
 */
export function getTexture(wallType: number): Texture {
  return TEXTURES[wallType] || TEXTURES[1];
}

/**
 * Sample texture for a wall strip
 * @param wallType Wall type (1-12)
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

  // Calculate brightness based on distance — brighter overall for The Finals look
  const maxDist = 16;
  const brightness = Math.max(0.3, 1 - (distance / maxDist));

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
 * @param floorType 0 = concrete, 1 = rubble, 2 = metal
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

  // Brighter floor rendering
  const maxDist = 12;
  const brightness = Math.max(0.2, 1 - (distance / maxDist));

  return sampleTexture(texture, u, v, brightness);
}

/**
 * Sample ceiling texture at world coordinates with animation
 * @param worldX World X position
 * @param worldY World Y position
 * @param distance Distance for brightness calculation
 * @param ceilingType 0 = sky, 1 = indoor
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

  // Scale for ceiling
  const scale = ceilingType === 0 ? 0.5 : 1.0;

  // Slow cloud drift for sky
  const scrollSpeed = ceilingType === 0 ? 0.015 : 0;
  const animOffsetX = animTime * scrollSpeed;
  const animOffsetY = animTime * scrollSpeed * 0.5;

  const u = ((worldX + animOffsetX) * scale) % 1;
  const v = ((worldY + animOffsetY) * scale) % 1;

  // Brighter ceiling
  const maxDist = 10;
  const brightness = Math.max(0.2, 0.9 - (distance / maxDist));

  return sampleTexture(texture, u < 0 ? u + 1 : u, v < 0 ? v + 1 : v, brightness);
}
