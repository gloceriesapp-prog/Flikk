# Product photo framing

ProductGalleryEditor and product-only ProductImageUpload use the same crop review.
The file batch is reviewed before any network upload; cancelling resolves with no
files and leaves the existing product draft unchanged. Selection order is retained.

Each photo starts with a centred 8:9 crop. Position and zoom are stored separately
per photo. The preview and 1440×1620 canvas export share productPhotoCropRect, so
framing does not depend on preview size. Keep full original returns the input file.
Image style (None / Standard / Premium) remains a separate choice after framing.

Native dialog supplies focus trapping and Escape handling. Object URLs and canvas
buffers are released; exports run sequentially to limit memory. Existing upload
compression, main-first ordering, gallery concurrency and background-style handling
remain in their current upload components. Non-product uploads skip crop review.
