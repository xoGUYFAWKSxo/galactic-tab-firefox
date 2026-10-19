"""Render the extra scene artwork: a nebula, a black hole and a ringed planet.

Each piece is drawn procedurally on a transparent square, like the spiral
galaxy, so the new-tab page and the browser-strip builder can treat them the
same way. Output goes to assets/art/*.webp.
"""
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'art'
SIZE = 1024
RENDER = 2048           # Drawn at twice the size, then reduced, for clean edges.


def grid(size):
    """x and y from -1 to 1 across the square, with y pointing down."""
    axis = (np.arange(size, dtype=np.float32) + .5) / size * 2 - 1
    return np.meshgrid(axis, axis)


def fbm(rng, size, base=4, octaves=6, gain=.55):
    """Smooth fractal noise in 0..1, built from upscaled random grids."""
    total = np.zeros((size, size), np.float32)
    weight = 1
    weights = 0
    for octave in range(octaves):
        cells = base * 2 ** octave
        layer = Image.fromarray(rng.random((cells, cells), dtype=np.float32), 'F')
        total += weight * np.asarray(layer.resize((size, size), Image.Resampling.BICUBIC))
        weights += weight
        weight *= gain
    total /= weights
    return (total - total.min()) / (total.max() - total.min())


def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a + (b - a) * t[..., None]


def color(*rgb):
    return np.array(rgb, np.float32) / 255


def add_stars(rgb, alpha, rng, count, size, spread, bright=4):
    """Small glowing stars inside the artwork; the brightest get four spikes."""
    x, y = grid(size)
    for index in range(count):
        angle, radius = rng.uniform(0, math.tau), spread * math.sqrt(rng.random())
        cx, cy = radius * math.cos(angle), radius * math.sin(angle)
        strength = rng.uniform(.35, 1) if index >= bright else 1.6
        width = rng.uniform(.0025, .005) if index >= bright else .007
        tint = color(*rng.choice([(255, 255, 255), (200, 220, 255), (255, 230, 200)]))
        d2 = (x - cx) ** 2 + (y - cy) ** 2
        glow = strength * (np.exp(-d2 / width ** 2) + .25 * np.exp(-d2 / (width * 4) ** 2))
        if index < bright:
            spikes = np.exp(-np.abs(y - cy) / .0016) * np.exp(-np.abs(x - cx) / .09)
            spikes += np.exp(-np.abs(x - cx) / .0016) * np.exp(-np.abs(y - cy) / .09)
            glow += .7 * spikes
        rgb += glow[..., None] * tint
        alpha += glow
    return rgb, alpha


def nebula(seed=11):
    rng = np.random.default_rng(seed)
    x, y = grid(RENDER)
    r = np.hypot(x, y)
    warp = fbm(rng, RENDER, base=3)
    shape = smoothstep(.98, .2, r * (.8 + .5 * warp))
    gas = fbm(rng, RENDER, base=4) ** 1.4
    filaments = 1 - np.abs(fbm(rng, RENDER, base=6, gain=.6) * 2 - 1)
    density = shape * (.55 * gas + .45 * filaments ** 3)
    dust = smoothstep(.5, .75, fbm(rng, RENDER, base=5)) * smoothstep(.95, .3, r)
    density *= 1 - .75 * dust
    hue = fbm(rng, RENDER, base=3)
    rgb = mix(color(70, 105, 255), color(222, 76, 190), smoothstep(.3, .7, hue))
    rgb = mix(rgb, color(80, 220, 225), smoothstep(.62, .85, fbm(rng, RENDER, base=4)) * .8)
    core = np.exp(-(r / .28) ** 2)
    rgb = mix(rgb, color(255, 236, 245), core * smoothstep(.3, .8, density) * .7)
    alpha = np.clip(density * 1.9, 0, 1) ** 1.15
    rgb = rgb * (.55 + .9 * density[..., None])
    stars = random.Random(seed)
    rgb *= alpha[..., None]
    rgb, alpha = add_stars(rgb, alpha, stars, 90, RENDER, .7)
    return finish(rgb, alpha)


def black_hole(seed=23):
    rng = random.Random(seed)
    x, y = grid(RENDER)
    r = np.hypot(x, y) + 1e-6
    theta = np.arctan2(y, x)
    shadow, inner, outer = .2, .235, .9
    # Streaks follow a logarithmic spiral, so the disk looks like it is swirling inward.
    swirl = theta + 1.7 * np.log(r)
    streaks = np.zeros_like(r)
    total = 0
    for _ in range(40):
        m = rng.randint(3, 120)
        amplitude = m ** -.35
        streaks += amplitude * np.sin(m * swirl + rng.uniform(0, math.tau) + rng.uniform(2, 12) * r)
        total += amplitude
    streaks = np.clip(.5 + 1.4 * streaks / total, 0, 1)
    rings = .9 + .1 * np.sin(r * 55 + 4 * streaks)
    profile = (inner / np.maximum(r, inner)) ** 1.35 * smoothstep(shadow, inner + .015, r) * smoothstep(outer, .45, r)
    light = profile * (.25 + 1.1 * streaks ** 2) * rings
    heat = np.clip((r - inner) / (outer - inner), 0, 1)
    rgb = mix(color(255, 247, 228), color(255, 168, 72), smoothstep(0, .35, heat))
    rgb = mix(rgb, color(176, 52, 40), smoothstep(.3, 1, heat))
    photon = np.exp(-((r - shadow * 1.04) / .007) ** 2)
    haze = .22 * np.exp(-((r - .35) / .5) ** 2) * smoothstep(1, .5, r)
    rgb = rgb * light[..., None] * 1.5 + photon[..., None] * color(255, 250, 240) * 1.4
    rgb += haze[..., None] * color(255, 150, 90) * .6
    alpha = np.clip(light * 1.6 + photon + haze, 0, 1)
    hole = smoothstep(shadow, shadow * .96, r)
    alpha = np.maximum(alpha, hole)
    rgb *= (1 - hole)[..., None]
    return finish(rgb, alpha)


def ringed_planet(seed=37):
    rng = np.random.default_rng(seed)
    x, y = grid(RENDER)
    tilt = math.radians(-17)
    u = x * math.cos(tilt) - y * math.sin(tilt)
    v = x * math.sin(tilt) + y * math.cos(tilt)
    radius, flat = .4, .3                     # flat: how open the rings look from here.
    d2 = (u ** 2 + v ** 2) / radius ** 2
    planet = smoothstep(1.0, .995, np.sqrt(d2))
    z = np.sqrt(np.clip(1 - d2, 0, 1))
    nx, ny = u / radius, v / radius
    lx, ly, lz = -.55, -.5, .67
    norm = math.sqrt(lx * lx + ly * ly + lz * lz)
    lit = np.clip((nx * lx + ny * ly + z * lz) / norm, 0, 1)
    shade = .06 + .94 * lit ** .85 * (.55 + .45 * z)
    turbulence = fbm(rng, RENDER, base=6) - .5
    latitude = ny + .045 * turbulence
    bands = np.zeros_like(latitude)
    for frequency, weight, phase in [(5, 1, .3), (11, .55, 1.7), (23, .3, .2), (41, .15, 2.4)]:
        bands += weight * np.sin(frequency * latitude * math.pi + phase)
    bands = .5 + .5 * bands / 2
    surface = mix(color(186, 128, 84), color(244, 222, 180), smoothstep(.25, .75, bands))
    surface = mix(surface, color(150, 90, 70), smoothstep(.85, .97, bands) * .6)
    rim = np.exp(-((1 - np.sqrt(np.clip(d2, 0, 1))) / .035) ** 2) * planet * (.3 + lit)
    body = surface * shade[..., None] + rim[..., None] * color(170, 190, 255) * .5
    # Rings lie in the planet's equator plane; the near half passes in front of the planet.
    rho = np.sqrt(u ** 2 + (v / flat) ** 2) / radius
    structure = .62 + .16 * np.sin(rho * 23) + .12 * np.sin(rho * 61 + 1) + .08 * np.sin(rho * 137 + 2)
    structure *= .8 + .2 * smoothstep(2.3, 1.5, rho)
    structure *= smoothstep(1.3, 1.36, rho) * smoothstep(2.3, 2.22, rho)
    structure *= 1 - .9 * smoothstep(.04, .0, np.abs(rho - 1.93))       # Cassini-style gap.
    structure *= 1 - .45 * smoothstep(.12, 0, np.abs(rho - 1.48))
    ring_rgb = mix(color(160, 130, 105), color(238, 222, 196), structure)
    # The planet's shadow falls across the rings behind it, away from the light.
    shadowed = (np.abs(u + .25 * v) < radius * .95) & (v < 0) & (u > -radius * .2)
    ring_light = np.where(shadowed, .25, 1) * (.75 + .25 * smoothstep(-1, 1, -u / radius))
    ring_alpha = np.clip(structure, 0, 1) * .92
    front = v > 0
    ring_alpha = np.where(~front & (planet > 0), ring_alpha * (1 - planet), ring_alpha)
    rgb = body * planet[..., None]
    alpha = planet.copy()
    ring_rgb = ring_rgb * ring_light[..., None]
    rgb = rgb * (1 - ring_alpha[..., None]) + ring_rgb * ring_alpha[..., None]
    alpha = alpha + ring_alpha * (1 - alpha)
    glow = .18 * np.exp(-((np.sqrt(d2) - 1) / .12) ** 2) * (np.sqrt(d2) > 1)
    rgb += glow[..., None] * color(150, 170, 255)
    alpha = np.clip(alpha + glow, 0, 1)
    return finish(rgb, alpha)


def finish(premultiplied, alpha):
    """Turn premultiplied color into a straight-alpha image at the final size."""
    alpha = np.clip(alpha, 0, 1)
    straight = np.where(alpha[..., None] > 1e-4, premultiplied / np.maximum(alpha[..., None], 1e-4), 0)
    rgba = np.dstack([np.clip(straight, 0, 1), alpha])
    image = Image.fromarray((rgba * 255).round().astype(np.uint8), 'RGBA')
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


PIECES = {'nebula': nebula, 'blackhole': black_hole, 'planet': ringed_planet}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name in sys.argv[1:] or PIECES:
        image = PIECES[name]()
        path = OUT / f'{name}.webp'
        image.save(path, quality=90, method=6, exact=False)
        print(f'Created {path.name} ({path.stat().st_size:,} bytes)', flush=True)


if __name__ == '__main__':
    main()
