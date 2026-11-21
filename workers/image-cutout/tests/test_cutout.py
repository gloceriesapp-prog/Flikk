import os
import sys
import unittest

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import cutout as c  # noqa: E402


def product(w, h, canvas=(1000, 1000), hole=False):
    """An opaque red rectangle of w x h centred on a transparent canvas."""
    img = Image.new("RGBA", canvas, (0, 0, 0, 0))
    x, y = (canvas[0] - w) // 2, (canvas[1] - h) // 2
    ImageDraw.Draw(img).rectangle([x, y, x + w - 1, y + h - 1], fill=(200, 30, 30, 255))
    if hole:
        ImageDraw.Draw(img).rectangle([x + w // 4, y + h // 4, x + 3 * w // 4, y + 3 * h // 4], fill=(0, 0, 0, 0))
    return img


class FitTest(unittest.TestCase):
    def assert_frame(self, result):
        img = result.image
        self.assertEqual(img.size, (720, 810))
        self.assertEqual(img.mode, "RGB")  # no transparency possible
        for xy in [(0, 0), (719, 0), (0, 809), (719, 809), (360, 0), (0, 405)]:
            self.assertEqual(img.getpixel(xy), c.BACKGROUND)

    def test_wide_product_touches_width_and_is_centred(self):
        r = c.fit(product(800, 400))
        self.assert_frame(r)
        left, top, right, bottom = r.box
        self.assertEqual((left, 720 - right), (36, 36))
        self.assertEqual(right - left, 648)
        self.assertLessEqual(bottom - top, 668)
        self.assertLessEqual(abs(top - (810 - bottom)), 1)
        self.assertAlmostEqual((right - left) / (bottom - top), 2.0, delta=0.01)
        self.assertIsNone(r.reason)

    def test_tall_product_touches_height_and_is_centred(self):
        r = c.fit(product(300, 900))
        self.assert_frame(r)
        left, top, right, bottom = r.box
        self.assertEqual((top, 810 - bottom), (71, 71))
        self.assertEqual(bottom - top, 668)
        self.assertLessEqual(abs(left - (720 - right)), 1)
        self.assertAlmostEqual((right - left) / (bottom - top), 300 / 900, delta=0.01)

    def test_safe_box_shape_gives_36_and_71_margins(self):
        r = c.fit(product(648, 668))
        self.assertEqual(r.box, (36, 71, 684, 739))

    def test_faint_pixels_do_not_widen_crop(self):
        img = product(400, 400)
        ImageDraw.Draw(img).rectangle([0, 0, 50, 50], fill=(0, 0, 0, 40))
        r = c.fit(img)
        left, top, right, bottom = r.box
        self.assertEqual(right - left, bottom - top)  # still the square, not the haze

    def test_two_x_upscale_is_low_resolution(self):
        r = c.fit(product(250, 250))  # needs 2.59x
        self.assertEqual(r.reason, c.REASON_LOW_RES)
        self.assert_frame(r)

    def test_under_two_x_is_fine(self):
        self.assertIsNone(c.fit(product(340, 340)).reason)  # 1.91x

    def test_over_three_x_is_not_enlarged(self):
        r = c.fit(product(200, 200))  # needs 3.24x
        self.assertEqual(r.reason, c.REASON_TOO_SMALL)
        self.assertIsNone(r.image)

    def test_webp_export(self):
        data = c.to_webp(c.fit(product(500, 500)).image)
        self.assertEqual(data[:4], b"RIFF")
        self.assertEqual(data[8:12], b"WEBP")


class QualityTest(unittest.TestCase):
    def test_clean_cutout_passes(self):
        self.assertTrue(c.check_quality(product(600, 700)).ok)

    def test_tiny_product_fails_coverage(self):
        q = c.check_quality(product(100, 100))
        self.assertFalse(q.ok)
        self.assertLess(q.coverage, c.MIN_COVERAGE)

    def test_nothing_removed_fails_coverage(self):
        self.assertFalse(c.check_quality(product(1000, 1000)).ok)

    def test_hole_fails(self):
        q = c.check_quality(product(600, 700, hole=True))
        self.assertFalse(q.ok)
        self.assertGreater(q.holes, c.MAX_HOLES)

    def test_soft_edges_fail(self):
        img = product(600, 700)
        ImageDraw.Draw(img).rectangle([200, 150, 799, 849], fill=(200, 30, 30, 120))
        q = c.check_quality(img)
        self.assertFalse(q.ok)
        self.assertGreater(q.soft_edge, c.MAX_SOFT_EDGE)

    def test_empty_fails(self):
        self.assertFalse(c.check_quality(Image.new("RGBA", (100, 100))).ok)


class ModelTest(unittest.TestCase):
    def test_bria_is_refused(self):
        with self.assertRaises(ValueError):
            c.remove_background(Image.new("RGB", (10, 10)), "bria-rmbg")


if __name__ == "__main__":
    unittest.main()
