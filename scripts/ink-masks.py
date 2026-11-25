"""Build the ink-transition masks in public/ink/ from the identity scans.

    pip install numpy pillow scipy
    python scripts/ink-masks.py <folder with the scans>

Each mask is a 512px signed-distance image: 0.5 is the edge of the mark,
brighter is deeper inside, darker is further out (range: 48px either side).
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src = sys.argv[1].rstrip('/') + '/'


def largest(m, minfrac):
    lab, n = nd.label(m)
    sizes = nd.sum(m, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * minfrac]
    return np.isin(lab, keep)


def death():
    # Death's cloak from "DADÁ, CORISCO e a morte"; the skull stays a hole
    im = np.array(Image.open(src + 'colagem-dada-corisco-morte.jpg').convert('L')).astype(float)
    m = nd.binary_opening(im[380:1080, 690:1200] < 70, iterations=1)
    m[520:, :140] = False  # a stray bit of the photo
    return largest(m, 0.2)


def chao():
    # the dark chao stencil on cardboard; the stencil bridges stay as gaps
    im = np.array(Image.open(src + 'stencil-chao-mal-papelao.jpg').convert('L')).astype(float)
    c = nd.gaussian_filter(im[500:1340, 0:800], 1.5)
    m = nd.binary_closing(nd.binary_opening(c < 75, iterations=2), iterations=2)
    return largest(m, 0.01)


S, R = 512, 48.0
for name, fn in [('death', death), ('chao', chao)]:
    m = fn()
    h, w = m.shape
    sc = S * 0.86 / max(h, w)
    img = Image.fromarray((m * 255).astype(np.uint8)).resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    canvas = Image.new('L', (S, S), 0)
    canvas.paste(img, ((S - img.width) // 2, (S - img.height) // 2))
    a = np.array(canvas) > 127
    sd = (nd.distance_transform_edt(a) - nd.distance_transform_edt(~a)) / R
    v = np.clip(0.5 + sd * 0.5, 0, 1)
    Image.fromarray((v * 255).round().astype(np.uint8)).save(f'public/ink/ink-{name}.png', optimize=True)
    print('public/ink/ink-%s.png' % name)
