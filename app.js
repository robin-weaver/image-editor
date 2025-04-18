
// canvas setup
const canvas = new fabric.Canvas('canvas');
// Create a noise texture programmatically
const createNoisePattern = () => {
  const patternCanvas = document.createElement('canvas');
  const patternCtx = patternCanvas.getContext('2d');
  const scale = 2; // Scale for higher resolution

  patternCanvas.width = 200 * scale;
  patternCanvas.height = 200 * scale;

  // Fill with base color (slightly off-white)
  patternCtx.fillStyle = '#f5f5f5';
  patternCtx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);

  // Add noise
  const imageData = patternCtx.getImageData(0, 0, patternCanvas.width, patternCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Random noise with brutalist contrast
    const noise = Math.random() * 20 - 10;
    data[i] = Math.max(0, Math.min(250, data[i] + noise));     // R
    data[i+1] = Math.max(0, Math.min(250, data[i+1] + noise)); // G
    data[i+2] = Math.max(0, Math.min(250, data[i+2] + noise)); // B
  }

  patternCtx.putImageData(imageData, 0, 0);
  return patternCanvas.toDataURL();
};

// Apply the noise pattern
const noisePattern = createNoisePattern();
canvas.setBackgroundColor(
  {source: noisePattern, repeat: 'repeat'},
  () => {
    canvas.renderAll();
  }
);
canvas.preserveObjectStacking = true;
fabric.Object.prototype.erasable = false;

function clearCanvas() {
    canvas.clear()
    canvas.setBackgroundColor(
        {source: 'checker.png', repeat: 'repeat'},
        () => {
            canvas.renderAll();
        }
    )
}

canvas.on('mouse:down', function(opt) {
    let pointer = canvas.getPointer(opt.e)
    console.log(pointer)
  var evt = opt.e;
  if (evt.altKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
  if (bucketMode && opt.target) {
      let pointer = canvas.getPointer(opt.e);
      let imagePointX = (pointer.x - activeObject.aCoords.tl.x) / activeObject.scaleX;
      let imagePointY = (pointer.y - activeObject.aCoords.tl.y) / activeObject.scaleY;
      paintBucket(Math.round(imagePointX), Math.round(imagePointY))
  }
});

canvas.on('mouse:move', function(opt) {
  if (this.isDragging) {
    var e = opt.e;
    var vpt = this.viewportTransform;
    vpt[4] += e.clientX - this.lastPosX;
    vpt[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }
});
canvas.on('mouse:up', function(opt) {
  // on mouse up we want to recalculate new interaction
  // for all objects, so we call setViewportTransform
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
});

canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

let activeObject;
canvas.on('selection:created', () => {
    activeObject = canvas.getActiveObject();
})

canvas.on('selection:updated', () => {
    activeObject = canvas.getActiveObject();
})

canvas.on('selection:cleared', () => {
    activeObject = undefined;
})


function onWindowResize() {
    canvas.setDimensions({width: window.innerWidth, height: window.innerHeight});
}

window.addEventListener('resize', onWindowResize)
onWindowResize()


// toolbar functions
function bringToFront() {
    canvas.bringToFront(activeObject);
}
function bringForward() {
    canvas.bringForward(activeObject);
}
function sendToBack() {
    canvas.sendToBack(activeObject);
}
function sendBackwards() {
    canvas.sendBackwards(activeObject);
}
function clone() {
    activeObject.clone(cloned => {
        canvas.discardActiveObject();
        cloned.set({
            left: cloned.left + 10,
            top: cloned.top + 10,
            evented: true
        });
        if (cloned.type === 'activeSelection') {
            cloned.canvas = canvas
            cloned.forEachObject(obj => {
                canvas.add(obj)
            });
            cloned.setCoords();
        } else {
            canvas.add(cloned)
        }
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
    })
}

function groupObjects() {
    if (!activeObject || activeObject.type !== 'activeSelection') {
      return;
    }
    activeObject.toGroup();
    canvas.requestRenderAll();
}
function ungroupObjects() {
    if (!activeObject || activeObject.type !== 'group') {
      return;
    }
    activeObject.toActiveSelection();
    canvas.requestRenderAll();
}
let previousSelected;
let paintControls = document.querySelector('#paint-controls');
let brushSizeControl = document.querySelector('#brush-size')
let brushTypeControls = document.querySelector('#brush-select')
let brushColorPicker = document.querySelector('#brush-color')
canvas.freeDrawingBrush.width = 20;
function togglePaintMode() {
    canvas.freeDrawingBrush.width = brushSizeControl.value
    canvas.freeDrawingBrush.color = brushColorPicker.value
    if (!canvas.isDrawingMode) {
        // set up for drawing
        paintControls.style.display = 'block'
        canvas.isDrawingMode = true
        let brushType = document.querySelector('input[name="brush"]:checked').value
        canvas.freeDrawingBrush = (brushType === 'paint') ? new fabric.PencilBrush(canvas) : new fabric.EraserBrush(canvas);
    } else {
        // unset all the drawing stuff
        paintControls.style.display = 'none'
        canvas.isDrawingMode = false
        if (previousSelected) {
            previousSelected.set('erasable', false)
            canvas.setActiveObject(previousSelected)
        }
    }
    if (activeObject) {
        activeObject.set('erasable', true)
        previousSelected  = canvas.getActiveObject()
    } else if (previousSelected) {
        previousSelected.set('erasable', false)
        canvas.setActiveObject(previousSelected)
    }
}
brushSizeControl.addEventListener('input', e => {
    canvas.freeDrawingBrush.width = e.target.value
    canvas.freeDrawingBrush.color = brushColorPicker.value
})
brushTypeControls.addEventListener('change', e => {
    canvas.freeDrawingBrush = (e.target.value === 'paint') ? new fabric.PencilBrush(canvas) : new fabric.EraserBrush(canvas);
    canvas.freeDrawingBrush.width = brushSizeControl.value
    canvas.freeDrawingBrush.color = brushColorPicker.value
})
brushColorPicker.addEventListener('input', e => {
    canvas.freeDrawingBrush.color = e.target.value
    canvas.freeDrawingBrush.width = brushSizeControl.value
})

function deleteObject() {
    canvas.remove(activeObject);
    if (activeObject && activeObject.type === 'activeSelection') {
        const objects = activeObject.getObjects();
        objects.forEach(obj => {
            canvas.remove(obj);
        });
    }
    canvas.discardActiveObject();
}

function downloadImage() {
    if (!canvas.getActiveObject()) {
        alert("No object selected.");
        return;
    }

    let activeObject = canvas.getActiveObject();

    // Ensure canvas doesn't have unsaved changes
    canvas.renderAll();

    // Get the bounding rectangle of the active object
    let br = activeObject.getBoundingRect();

    // These coordinates assume the top-left of the canvas as (0, 0)
    let left = br.left - activeObject.strokeWidth / 2;
    let top = br.top - activeObject.strokeWidth / 2;
    let width = br.width + activeObject.strokeWidth;
    let height = br.height + activeObject.strokeWidth;
    canvas.setBackgroundColor(
        'rgba(0, 0, 0, 0)',
        () => {
            canvas.renderAll();
            // Generate the image URL based on the bounding rectangle
            let dataURL = canvas.toDataURL({
                format: 'png',
                left: left,
                top: top,
                width: width,
                height: height
            });
            download(dataURL, 'imageweave.png');
            canvas.setBackgroundColor(
                {source: 'checker.png', repeat: 'repeat'},
                () => {
                    canvas.renderAll();
                }
            );
        }
    );
}



function download(dataurl, filename) {
    let link = document.createElement("a");
    link.href = dataurl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// sidebar functions

const imageUrlInput = document.getElementById('imageUrl');
function addImageFromURL() {
    const imageURL = imageUrlInput.value;

    fetch(imageURL, { mode: 'cors' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.blob();
        })
        .then(blob => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;

                img.onload = function() {
                    const imgInstance = new fabric.Image(img);
                    canvas.add(imgInstance);
                };
            };
            reader.readAsDataURL(blob);
        })
        .catch(error => {
            console.error('Error fetching image:', error);
        });

    imageUrlInput.value = '';
}
imageUrlInput.addEventListener('paste', (event) => {
  const clipboardData = event.clipboardData;
  if (clipboardData && clipboardData.files) {
      handleImageFiles(Array.from(clipboardData.files))
  }
});
const dropzone = document.getElementById('dropzone');
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-over');
  const droppedFiles = event.dataTransfer.files;
  handleImageFiles(Array.from(droppedFiles))
});
const selectImageButton = document.getElementById('selectImageButton');
selectImageButton.addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 0) {
        handleImageFiles(selectedFiles);
    }
  });
  fileInput.click();
});
function handleImageFiles(files) {
    const  center = CenterCoord()
  files.forEach(imageFile => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataURL = event.target.result;
      fabric.Image.fromURL(dataURL, (img) => {
          img.set({
              left: center.x,
              top: center.y
          })
          canvas.add(img);
      });
    };
      if (imageFile.type.startsWith('image/')) {
      reader.readAsDataURL(imageFile);
    }
  });
}




// floating toolbar functionality
const toolbar = document.getElementById('toolbar');
const grabHandle = document.getElementById('grab-handle');
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
grabHandle.addEventListener('mousedown', () => {
    isDragging = true;
    offsetX = event.clientX - toolbar.offsetLeft;
    offsetY = event.clientY - toolbar.offsetTop;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});
document.addEventListener('mousemove', (event) => {
    if (isDragging) {
        toolbar.style.left = event.clientX - offsetX + 'px';
        toolbar.style.top = event.clientY - offsetY + 'px';
    }
});

function CenterCoord(){
    const zoom = canvas.getZoom()
   return{
      x:fabric.util.invertTransform(canvas.viewportTransform)[4]+(canvas.width/zoom)/2,
      y:fabric.util.invertTransform(canvas.viewportTransform)[5]+(canvas.height/zoom)/2
   }
}

// separation
function splitImage() {
    const srcCanvas = document.createElement('canvas');
    const ctx = srcCanvas.getContext('2d');
    srcCanvas.width = activeObject.getScaledWidth();
    srcCanvas.height = activeObject.getScaledHeight();
    activeObject.cloneAsImage((clonedImg) => {
        ctx.drawImage(clonedImg.getElement(), 0, 0, srcCanvas.width, srcCanvas.height);
        const imageData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
        const data = imageData.data;

        const visited = new Uint8Array(srcCanvas.width * srcCanvas.height);
        const segments = [];

        function isTransparent(x, y) {
            const i = (y * srcCanvas.width + x) * 4;
            return data[i + 3] === 0;
        }

        function floodFillBFS(startX, startY) {
            const queue = [[startX, startY]];
            const segment = [];
            while (queue.length) {
                const [x, y] = queue.shift();  // Dequeue
                if (x < 0 || x >= srcCanvas.width || y < 0 || y >= srcCanvas.height) continue;
                const index = y * srcCanvas.width + x;
                if (visited[index] || isTransparent(x, y)) continue;
                visited[index] = 1;  // Mark as visited
                segment.push([x, y]);
                // Enqueue all 4 directional neighbors
                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
            return segment;
        }

        for (let y = 0; y < srcCanvas.height; y++) {
            for (let x = 0; x < srcCanvas.width; x++) {
                if (!visited[y * srcCanvas.width + x] && !isTransparent(x, y)) {
                    const segment = floodFillBFS(x, y);
                    if (segment.length > 0) {
                        segments.push(segment);
                    }
                }
            }
        }

        let AOLeft = activeObject.left
        let AOTop = activeObject.top
        segments.forEach(segment => {
            const bounds = segment.reduce((acc, [x, y]) => ({
                minX: Math.min(acc.minX, x),
                maxX: Math.max(acc.maxX, x),
                minY: Math.min(acc.minY, y),
                maxY: Math.max(acc.maxY, y)
            }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

            const regionWidth = bounds.maxX - bounds.minX + 1;
            const regionHeight = bounds.maxY - bounds.minY + 1;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = regionWidth;
            tempCanvas.height = regionHeight;
            const tempCtx = tempCanvas.getContext('2d');
            const segmentImageData = tempCtx.createImageData(regionWidth, regionHeight);

            segment.forEach(([x, y]) => {
                const localX = x - bounds.minX;
                const localY = y - bounds.minY;
                const segmentIndex = (localY * regionWidth + localX) * 4;
                const canvasIndex = (y * srcCanvas.width + x) * 4;
                for (let i = 0; i < 4; i++) {
                    segmentImageData.data[segmentIndex + i] = data[canvasIndex + i];
                }
            });
            tempCtx.putImageData(segmentImageData, 0, 0);

            fabric.Image.fromURL(tempCanvas.toDataURL(), (newImg) => {
                newImg.set({
                    left: AOLeft + bounds.minX + 10,
                    top: AOTop + bounds.minY + 10,
                });
                canvas.add(newImg);
                canvas.renderAll();
            });
        });
        canvas.remove(activeObject);
    }, {
        crossOrigin: 'anonymous'
    });
}

const worker = new Worker('worker.js', {
    type: 'module',
});

let currentDepthData;
let originalImageData;
let currentImageOnCanvas;
let imageObject;
let segmentPoints = [];
let decodeResultArray = [];

worker.addEventListener('message', e => {
    const { type, data } = e.data
    console.log(type, ' | ')
    if (type === 'depth_result') {
        handleDepthResult(data)
    } else if (type === 'segment_result' && data === 'done') {
        canvas.selection = false;
        const segmentationControls = document.getElementById('segment-controls');
        segmentationControls.style.display = 'block';
        const imageBoundingRect = imageToSegment.getBoundingRect();
        segmentationControls.style.left = `${imageBoundingRect.left}px`;
        segmentationControls.style.top = `${imageBoundingRect.top + imageBoundingRect.height + 10}px`;
        canvas.on('mouse:down', handleMouseDown);
    } else if (type === 'decode_result') {
        decodeResultArray.push(data)
        handleDecodeResult();
    }
})

// depth removal stuff

async function startDepthEstimation() {
    const activeObject = canvas.getActiveObject();
    imageObject = activeObject
    imageObject['selectable'] = false;
    if (!activeObject || activeObject.type !== 'image') {
        alert("No image selected!");
        return;
    }
    currentImageOnCanvas = activeObject;
    worker.postMessage({type: 'depth', data: activeObject.toDataURL({withoutTransform: true})})
    originalImageData = activeObject._element;
    canvas.discardActiveObject()
}

function handleDepthResult(data) {
    currentDepthData = data
    let minDepth = Infinity;
    let maxDepth = -Infinity;
    for (let depthValue of currentDepthData) {
        if (depthValue < minDepth) {
            minDepth = depthValue;
        }
        if (depthValue > maxDepth) {
            maxDepth = depthValue;
        }
    }
    // Update the depth slider's minimum, maximum, and reset its current value
    const depthSlider = document.getElementById('depthSlider');
    depthSlider.min = minDepth;
    depthSlider.max = maxDepth;
    depthSlider.value = minDepth
    // Show the slider and button
    const panel = document.getElementById('depthControlPanel');
    panel.style.display = 'block';
    const imageBoundingRect = imageObject.getBoundingRect();
    panel.style.left = `${imageBoundingRect.left}px`;
    panel.style.top = `${imageBoundingRect.top + imageBoundingRect.height + 10}px`;
}


document.getElementById('depthSlider').addEventListener('input', function() {
    const depthThreshold = parseFloat(this.value);
    updateImageBasedOnDepth(depthThreshold);
});

function confirmDepth() {
    document.getElementById('depthControlPanel').style.display = 'none';
    currentImageOnCanvas.setCoords();
    imageObject['selectable'] = true;
    canvas.setActiveObject(imageObject);
}


function updateImageBasedOnDepth(threshold) {
    const width = currentImageOnCanvas.width;
    const height = currentImageOnCanvas.height;

    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    ctx.drawImage(originalImageData, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0, len = currentDepthData.length; i < len; i++) {
        if (currentDepthData[i] < threshold) {
            // data[i * 4] = 0;
            // data[i * 4 + 1] = 0;
            // data[i * 4 + 2] = 0;
            data[i * 4 + 3] = 0; // alpha channel
        }
    }
    ctx.putImageData(imgData, 0, 0);
    currentImageOnCanvas.setElement(offscreenCanvas);
    currentImageOnCanvas.setCoords();
    canvas.requestRenderAll();
}


// segmentation stuff

let imageToSegment;
let imageToSegmentOrigSrc;
function startSegmentation() {
    if (!activeObject || activeObject.type !== 'image' && activeObject.type !== 'group') {
        alert("No image or non-image object selected!");
        return;
    }
    imageToSegment = activeObject;
    imageToSegmentOrigSrc = imageToSegment.toDataURL()
    imageToSegment['selectable'] = false;
    canvas.discardActiveObject()
    worker.postMessage({type: 'segment', data: imageToSegment.toDataURL()})
}

canvas.upperCanvasEl.addEventListener('contextmenu', function(e) {
    e.preventDefault();
}, false);

let selecting = true;
function switchSegmentationMode() {
    selecting = !selecting
    document.getElementById('switch-selecting').textContent = selecting ? 'Selecting' : 'Deselecting'
}

function handleMouseDown(options) {
    if (options.target && options.target === imageToSegment) {
        removeLastPoint.disabled = false;
        var pointer = canvas.getPointer(options.e);

        // Transform canvas coordinates to image-local coordinates by accounting for the position and scale
        var imagePointX = (pointer.x - imageToSegment.aCoords.tl.x) / imageToSegment.scaleX;
        var imagePointY = (pointer.y - imageToSegment.aCoords.tl.y) / imageToSegment.scaleY;

        const label = selecting ? 1 : 0
        // Store the coordinates relative to the image itself
        segmentPoints.push({
            point: [Math.round(imagePointX), Math.round(imagePointY)],
            label: label
        });

        console.log(segmentPoints)
        worker.postMessage({type: 'decode', data: segmentPoints});
    }
}

function handleDecodeResult() {
        for (const decodeResult of decodeResultArray) {
            const { mask, scores } = decodeResult;

            // Since Fabric.js handles elements differently, let's create a temporary element to manipulate
            var tempCanvas = document.createElement('canvas');
            var tempContext = tempCanvas.getContext('2d');
            tempCanvas.width = imageToSegment.width;
            tempCanvas.height = imageToSegment.height;

            // Draw the Fabric image element onto this temporary canvas
            tempContext.drawImage(imageToSegment.getElement(), 0, 0);

            const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const pixelData = imageData.data;

            // Select the best mask based on score
            const numMasks = scores.length;
            let bestIndex = 0;
            for (let i = 1; i < numMasks; ++i) {
                if (scores[i] > scores[bestIndex]) {
                    bestIndex = i;
                }
            }
            console.log('Applying best mask: ', bestIndex)

            // Overlay mask with a color and semi-transparency
            for (let i = 0; i < mask.data.length / numMasks; i++) {
                if (mask.data[numMasks * i + bestIndex] === (maskReversed ? 0 : 1)) {
                    const offset = 4 * i;
                    pixelData[offset] = (pixelData[offset] + 0) / 2;       // blend red
                    pixelData[offset + 1] = (pixelData[offset + 1] + 50) / 2; // blend green
                    pixelData[offset + 2] = (pixelData[offset + 2] + 150) / 2; // blend blue
                    pixelData[offset + 3] = 127; // semi-transparent alpha
                }
            }

            // Apply edited image data back to the temporary canvas context
            tempContext.putImageData(imageData, 0, 0);

            // Convert the canvas to a Data URL and update the Fabric image
            var dataURL = tempCanvas.toDataURL();
            imageToSegment.setSrc(dataURL, function() {
                canvas.renderAll(); // Rerender the canvas to display changes
            });
        }

}

function confirmSegmentation() {
    segmentPoints = []
    removeLastPoint.disabled = true;
    imageToSegment.setSrc(imageToSegmentOrigSrc, function() {
        canvas.renderAll(); // Rerender the canvas to ensure it displays the original image
        document.getElementById('segment-controls').style.display = 'none';  // Hide the segment controls
        canvas.off('mouse:down', handleMouseDown);
        imageToSegment['selectable'] = true;



        // Create a canvas for creating the new images
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = imageToSegment.width;
        tempCanvas.height = imageToSegment.height;

        // Draw the original image to the temp canvas
        tempContext.drawImage(imageToSegment.getElement(), 0, 0);

        // Retrieve image data for masking
        const imageToSegmentData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const pixelData = imageToSegmentData.data;

        // Create an image data for the inverted mask
        const invertedImageData = tempContext.createImageData(tempCanvas.width, tempCanvas.height);
        const invertedPixelData = invertedImageData.data;

        // Copy original data to inverted data initially
        invertedPixelData.set(pixelData);

        for (const decodeResult of decodeResultArray) {
            const {mask, scores} = decodeResult;


            // Select best mask based on score
            const numMasks = scores.length;
            let bestIndex = 0;
            for (let i = 1; i < numMasks; ++i) {
                if (scores[i] > scores[bestIndex]) {
                    bestIndex = i;
                }
            }

            // Apply mask to image and prepare the inverted mask image
            for (let i = 0; i < pixelData.length / 4; i++) {
                if (mask.data[numMasks * i + bestIndex] === (maskReversed ? 0 : 1)) {
                    // Masked (transparent for inverted)
                    invertedPixelData[i * 4 + 3] = 0;
                } else {
                    // Not masked (transparent for primary)
                    pixelData[i * 4 + 3] = 0;
                }
            }
        }
        decodeResultArray = []

        // Put the masked data back to canvas to create the first image
        tempContext.putImageData(imageToSegmentData, 0, 0);

        // Create new Fabric Image from the mask canvas
        const finalMaskedURL = tempCanvas.toDataURL();
        fabric.Image.fromURL(finalMaskedURL, function(fabricImage) {
            canvas.add(fabricImage);
            fabricImage.set({
                top: imageToSegment.top + 10,
                left: imageToSegment.left + 10,
                evented: true
            });
        });

        // Put the inverted mask data back to canvas to create the second image
        tempContext.putImageData(invertedImageData, 0, 0);

        // Create new Fabric Image from the inverted mask canvas
        const finalInvertedURL = tempCanvas.toDataURL();
        fabric.Image.fromURL(finalInvertedURL, function(fabricImageInverted) {
            canvas.add(fabricImageInverted);
            fabricImageInverted.set({
                top: imageToSegment.top + 20,
                left: imageToSegment.left + 20,
                evented: true
            });
        });
    });
}
const removeLastPoint = document.getElementById('remove-point')
removeLastPoint.addEventListener('click', e => {
    if (segmentPoints) {
        segmentPoints.splice(-1, 1)
        if (segmentPoints.length === 0) {
            removeLastPoint.disabled = true
        } else {
            worker.postMessage({type: 'decode', data: segmentPoints});
        }
    }
})

let maskReversed = false;
function reverseMask() {
    maskReversed = !maskReversed;
    if (decodeResultArray.length !== 0) {
        handleDecodeResult()
    }
}

function addImageToCanvas(rawData) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = rawData.width;
  offCanvas.height = rawData.height;
  const ctx = offCanvas.getContext('2d');

  const rgba = new Uint8ClampedArray(rawData.width * rawData.height * 4);

  for (let i = 0, j = 0; i < rawData.data.length; i += 3, j += 4) {
    rgba[j]     = rawData.data[i];     // R
    rgba[j + 1] = rawData.data[i + 1]; // G
    rgba[j + 2] = rawData.data[i + 2]; // B
    rgba[j + 3] = 255;                 // A (full opacity)
  }

  const imageData = new ImageData(rgba, rawData.width, rawData.height);
  ctx.putImageData(imageData, 0, 0);

  const imgElement = new Image();
  imgElement.onload = function () {
    const fabricImage = new fabric.Image(imgElement);
    fabricImage.set({
      left: imgToUpscale.left + 50,
      top: imgToUpscale.top + 50
    });
    canvas.add(fabricImage);
    canvas.renderAll();
  };
  imgElement.src = offCanvas.toDataURL();
}

let bucketMode = false
let bucketModeButton = document.querySelector('#toggle-bucket')
let bucketColor = [0, 0, 0, 0]
let bucketThreshold = 20
function toggleBucketMode() {
    bucketMode = !bucketMode
    bucketModeButton.textContent = bucketMode ? 'bucketmode on' : 'bucketmode off'
    document.body.style.cursor = bucketMode ? 'crosshair' : 'auto'
}

let bucketColorPicker = document.querySelector('#bucket-color')
bucketColorPicker.addEventListener('input', () => {
    bucketColor = hexToRgba(bucketColorPicker.value)
    bucketColor[3] = bucketAlphaPicker.value
})

let bucketThresholdPicker = document.querySelector('#bucket-threshold')
bucketThresholdPicker.addEventListener('input', () => {
    bucketThreshold = bucketThresholdPicker.value
})

let bucketAlphaPicker = document.querySelector('#bucket-alpha')
bucketAlphaPicker.addEventListener('input', () => {
    bucketColor[3] = bucketAlphaPicker.value
})

function getColorAtPosition(x, y, data, width) {
    const index = (y * width + x) * 4;
    return data.slice(index, index + 4);  // returns [r, g, b, a]
}

const ffWorker = new Worker('floodfill.js');
function paintBucket(startX, startY) {
    const srcCanvas = document.createElement('canvas');
    const ctx = srcCanvas.getContext('2d');
    const width = activeObject.getScaledWidth();
    const height = activeObject.getScaledHeight();
    srcCanvas.width = width;
    srcCanvas.height = height;

    activeObject.cloneAsImage((clonedImg) => {
        ctx.drawImage(clonedImg.getElement(), 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        ffWorker.postMessage({
            imageData: imageData,
            startX, startY,
            fillColor: bucketColor, // Assume global or passed
            targetColor: getColorAtPosition(startX, startY, imageData.data, width),
            width, height,
            bucketThreshold: bucketThreshold // Assume global or passed
        });

        ffWorker.onmessage = function(e) {
            ctx.putImageData(e.data.imageData, 0, 0);
            fabric.Image.fromURL(srcCanvas.toDataURL(), (newImg) => {
                newImg.set({ left: activeObject.left, top: activeObject.top, scaleX: activeObject.scaleX, scaleY: activeObject.scaleY, angle: activeObject.angle });
                canvas.remove(activeObject);
                canvas.add(newImg);
                canvas.setActiveObject(newImg);
                canvas.renderAll();
            });
        };
    }, { crossOrigin: 'anonymous' });
}

function hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = 255; // opaque
    return [r, g, b, a];
}


const Base64Prefix = "data:application/pdf;base64,";
function getPdfHandler() {
    // pdfjsLib should be available globally since we've loaded the script in HTML
    return pdfjsLib;
}

function readBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result));
        reader.addEventListener('error', reject);
        reader.readAsDataURL(blob);
    });
}

async function printPDF(pdfData, pages) {
    const pdfjsLib = await getPdfHandler();
    pdfData = pdfData instanceof Blob ? await readBlob(pdfData) : pdfData;
    const data = atob(pdfData.startsWith(Base64Prefix) ? pdfData.substring(Base64Prefix.length) : pdfData);
    const loadingTask = pdfjsLib.getDocument({ data });
    return loadingTask.promise.then(async (pdf) => {
        const numPages = pdf.numPages;
        const pageCanvases = await Promise.all(
            [...Array(numPages).keys()].map(async i => {
                const pageNumber = i + 1;
                if (pages && pages.indexOf(pageNumber) == -1) {
                    return null;
                }

                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 2 }); // Default scale to render at original resolution
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
                return canvas;
            })
        );
        return pageCanvases.filter(Boolean); // Remove any null elements
    });
}

async function pdfToImage(pdfData, fabricCanvas) {
    const canvases = await printPDF(pdfData);
    const fabricImages = await Promise.all(
        canvases.map(async c => {
            const img = new fabric.Image(c, { scaleX: 1, scaleY: 1 });
            fabricCanvas.add(img);
            fabricCanvas.requestRenderAll();
        })
    );
    return fabricImages;
}


document.querySelector('#file-input').addEventListener('change', async (e) => {
    canvas.requestRenderAll();
    await Promise.all(pdfToImage(e.target.files[0], canvas));
});


let textBox = document.querySelector('#text-input')
function addText() {
    let textToAdd = textBox.value
    if (!textToAdd) return
    let coords = CenterCoord()
    let text = new fabric.Text(textToAdd, {
        left: coords.x,
        top: coords.y
    })
    canvas.add(text)
    textBox.value = ''
    canvas.setActiveObject(text)
    updateText()
}

let fontSelect = document.querySelector('#font-select')
let alignSelect = document.querySelector('#align-select')
let lineHeightSelect = document.querySelector('#lineHeight-select')
let fillColorSelect = document.querySelector('#fillColor-select')
let strokeColorSelect = document.querySelector('#strokeColor-select')
let strokeWidthSelect = document.querySelector('#strokeWidth-select')
let highlightColorSelect = document.querySelector('#highlightColor-select')
let highlightEnabled = document.querySelector('#highlight-enabled')
function updateText() {
    if (!activeObject) return

    const outlineEnabled = document.querySelector('#outline-enabled').checked;
    const outlineColor = document.querySelector('#outline-color').value;
    const outlineWidth = parseInt(document.querySelector('#outline-width').value);

    // Apply the text properties
    activeObject.set({
        fontFamily: fontSelect.value,
        textAlign: alignSelect.value,
        lineHeight: lineHeightSelect.value,
        textBackgroundColor: highlightEnabled.checked ? highlightColorSelect.value : null
    })

    // Handle special case for outlined text
    if (outlineEnabled) {
        // Create the outlined effect
        activeObject.set({
            fill: fillColorSelect.value,
            stroke: outlineColor,
            strokeWidth: outlineWidth,
            paintFirst: 'stroke'  // This makes the stroke appear outside the text
        });
    } else {
        // Regular text styling
        activeObject.set({
            fill: fillColorSelect.value,
            stroke: strokeColorSelect.value,
            strokeWidth: strokeWidthSelect.value,
            paintFirst: 'fill'
        });
    }

    canvas.requestRenderAll()
}

let OCRWorker;

(async () => {
    OCRWorker = await Tesseract.createWorker('eng', 1, {
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
        logger: function(m) {
          console.log(m.progress);
        }
    })
    console.log('OCR init')
})()


async function runOCR() {
    if (!activeObject) {
        console.log('no selection')
      return;
    }
    console.log('running ocr')
    let res = await OCRWorker.recognize(activeObject.toDataURL())
    console.log(res.data.text)
    let dialog = document.querySelector('#info-dialog')
    dialog.innerHTML = `
    <textarea style="height: 240px; width: 240px">${res.data.text}</textarea>`
    dialog.showModal()
    document.querySelector('#ocr-output').value = res.data.text
    console.log('ocr done')
}


// High Quality Shape Eraser Implementation
let isShapeEraserMode = false;
let currentShapeType = 'circle';
let shapeEraserStartPoint = null;
let tempShapeEraserObject = null;

function toggleShapeEraserMode() {
    isShapeEraserMode = !isShapeEraserMode;
    document.getElementById('toggle-shape-eraser').textContent = isShapeEraserMode ? 'Shape Eraser: ON' : 'Shape Eraser: OFF';

    if (isShapeEraserMode) {
        // Disable other modes
        if (canvas.isDrawingMode) togglePaintMode();
        if (bucketMode) toggleBucketMode();

        // Set cursor
        document.body.style.cursor = 'crosshair';

        // Add mouse event listeners for shape drawing
        canvas.on('mouse:down', startShapeEraser);
        canvas.on('mouse:move', drawShapeEraser);
        canvas.on('mouse:up', endShapeEraser);
    } else {
        // Reset cursor
        document.body.style.cursor = 'default';

        // Remove mouse event listeners
        canvas.off('mouse:down', startShapeEraser);
        canvas.off('mouse:move', drawShapeEraser);
        canvas.off('mouse:up', endShapeEraser);

        // Remove temporary shape if it exists
        if (tempShapeEraserObject) {
            canvas.remove(tempShapeEraserObject);
            tempShapeEraserObject = null;
        }
    }
}

function setShapeType(type) {
    currentShapeType = type;
    const shapeButtons = document.querySelectorAll('.shape-type-btn');
    shapeButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`shape-${type}`).classList.add('active');
}

function startShapeEraser(o) {
    if (!isShapeEraserMode || !activeObject) return;

    const pointer = canvas.getPointer(o.e);
    shapeEraserStartPoint = pointer;

    // Create initial shape
    switch (currentShapeType) {
        case 'circle':
            tempShapeEraserObject = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 1,
                fill: 'rgba(255, 0, 0, 0.3)',
                stroke: 'red',
                strokeWidth: 1,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            break;
        case 'ellipse':
            tempShapeEraserObject = new fabric.Ellipse({
                left: pointer.x,
                top: pointer.y,
                rx: 1,
                ry: 1,
                fill: 'rgba(255, 0, 0, 0.3)',
                stroke: 'red',
                strokeWidth: 1,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            break;
        case 'rect':
            tempShapeEraserObject = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                width: 1,
                height: 1,
                fill: 'rgba(255, 0, 0, 0.3)',
                stroke: 'red',
                strokeWidth: 1,
                originX: 'left',
                originY: 'top',
                selectable: false,
                evented: false
            });
            break;
        case 'triangle':
            tempShapeEraserObject = new fabric.Triangle({
                left: pointer.x,
                top: pointer.y,
                width: 1,
                height: 1,
                fill: 'rgba(255, 0, 0, 0.3)',
                stroke: 'red',
                strokeWidth: 1,
                originX: 'left',
                originY: 'top',
                selectable: false,
                evented: false
            });
            break;
        case 'polygon':
            tempShapeEraserObject = new fabric.Polygon([
                { x: pointer.x, y: pointer.y },
                { x: pointer.x + 1, y: pointer.y },
                { x: pointer.x + 0.5, y: pointer.y + 1 }
            ], {
                fill: 'rgba(255, 0, 0, 0.3)',
                stroke: 'red',
                strokeWidth: 1,
                selectable: false,
                evented: false
            });
            break;
    }

    canvas.add(tempShapeEraserObject);
}

function drawShapeEraser(o) {
    if (!isShapeEraserMode || !shapeEraserStartPoint || !tempShapeEraserObject) return;

    const pointer = canvas.getPointer(o.e);

    switch (currentShapeType) {
        case 'circle':
            const radius = Math.sqrt(
                Math.pow(pointer.x - shapeEraserStartPoint.x, 2) +
                Math.pow(pointer.y - shapeEraserStartPoint.y, 2)
            );
            tempShapeEraserObject.set({ radius: radius });
            break;
        case 'ellipse':
            const rx = Math.abs(pointer.x - shapeEraserStartPoint.x);
            const ry = Math.abs(pointer.y - shapeEraserStartPoint.y);
            tempShapeEraserObject.set({ rx: rx, ry: ry });
            break;
        case 'rect':
        case 'triangle':
            const width = pointer.x - shapeEraserStartPoint.x;
            const height = pointer.y - shapeEraserStartPoint.y;
            tempShapeEraserObject.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width < 0 ? pointer.x : shapeEraserStartPoint.x,
                top: height < 0 ? pointer.y : shapeEraserStartPoint.y
            });
            break;
        case 'polygon':
            // For polygon, we'll make a simple polygon with the mouse points
            const points = [
                { x: shapeEraserStartPoint.x, y: shapeEraserStartPoint.y },
                { x: pointer.x, y: shapeEraserStartPoint.y },
                { x: pointer.x, y: pointer.y },
                { x: shapeEraserStartPoint.x, y: pointer.y }
            ];
            tempShapeEraserObject.set({ points: points });
            break;
    }

    canvas.renderAll();
}

function endShapeEraser() {
    if (!isShapeEraserMode || !tempShapeEraserObject || !activeObject) {
        if (tempShapeEraserObject) {
            canvas.remove(tempShapeEraserObject);
            tempShapeEraserObject = null;
        }
        shapeEraserStartPoint = null;
        return;
    }

    // Only proceed with images
    if (activeObject && activeObject.type === 'image') {
        // Keep the original HTML Image element reference for high quality
        const originalElement = activeObject._element;

        // We create a clipping path from our shape
        const clipShape = fabric.util.object.clone(tempShapeEraserObject);

        // Transform the shape into the image's coordinate space
        const transformedShape = getTransformedShape(clipShape, activeObject);

        // Create a path string for the eraser shape
        let eraserPath;
        switch (clipShape.type) {
            case 'circle':
                // We need a path for the clipPath
                eraserPath = new fabric.Path(createCirclePath(
                    transformedShape.left,
                    transformedShape.top,
                    transformedShape.radius
                ));
                break;
            case 'ellipse':
                eraserPath = new fabric.Path(createEllipsePath(
                    transformedShape.left,
                    transformedShape.top,
                    transformedShape.rx,
                    transformedShape.ry
                ));
                break;
            case 'rect':
                eraserPath = new fabric.Path(createRectPath(
                    transformedShape.left,
                    transformedShape.top,
                    transformedShape.width,
                    transformedShape.height
                ));
                break;
            case 'triangle':
                eraserPath = new fabric.Path(createTrianglePath(
                    transformedShape.left,
                    transformedShape.top,
                    transformedShape.width,
                    transformedShape.height
                ));
                break;
            case 'polygon':
                eraserPath = new fabric.Path(createPolygonPath(transformedShape.points));
                break;
        }

        if (!eraserPath) {
            // Clean up if we couldn't create a path
            canvas.remove(tempShapeEraserObject);
            tempShapeEraserObject = null;
            return;
        }

        // Now we need to process the image to create the transparent areas
        // Create a canvas at the NATURAL size of the image (no quality loss)
        const srcCanvas = document.createElement('canvas');
        const ctx = srcCanvas.getContext('2d');
        srcCanvas.width = originalElement.naturalWidth;
        srcCanvas.height = originalElement.naturalHeight;

        // Draw the image at its full size
        ctx.drawImage(originalElement, 0, 0, srcCanvas.width, srcCanvas.height);

        // Create a similar sized canvas for the mask
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = srcCanvas.width;
        maskCanvas.height = srcCanvas.height;

        // Scale the eraser path to match the natural image size
        const scaleX = originalElement.naturalWidth / activeObject.width;
        const scaleY = originalElement.naturalHeight / activeObject.height;

        // Draw the mask
        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.fillStyle = 'white';

        // Create adjusted shape for the natural size
        maskCtx.beginPath();
        switch (currentShapeType) {
            case 'circle':
                maskCtx.arc(
                    transformedShape.left * scaleX,
                    transformedShape.top * scaleY,
                    transformedShape.radius * scaleX,  // Use scale X for simplicity
                    0, Math.PI * 2
                );
                break;
            case 'ellipse':
                maskCtx.ellipse(
                    transformedShape.left * scaleX,
                    transformedShape.top * scaleY,
                    transformedShape.rx * scaleX,
                    transformedShape.ry * scaleY,
                    0, 0, Math.PI * 2
                );
                break;
            case 'rect':
                maskCtx.rect(
                    transformedShape.left * scaleX,
                    transformedShape.top * scaleY,
                    transformedShape.width * scaleX,
                    transformedShape.height * scaleY
                );
                break;
            case 'triangle': {
                const x = transformedShape.left * scaleX;
                const y = transformedShape.top * scaleY;
                const w = transformedShape.width * scaleX;
                const h = transformedShape.height * scaleY;
                maskCtx.moveTo(x + w/2, y);
                maskCtx.lineTo(x, y + h);
                maskCtx.lineTo(x + w, y + h);
                break;
            }
            case 'polygon':
                if (transformedShape.points && transformedShape.points.length > 0) {
                    const scaledPoints = transformedShape.points.map(pt => ({
                        x: pt.x * scaleX,
                        y: pt.y * scaleY
                    }));
                    maskCtx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                    for (let i = 1; i < scaledPoints.length; i++) {
                        maskCtx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
                    }
                }
                break;
        }
        maskCtx.closePath();
        maskCtx.fill();

        // Apply the mask to the image data
        const imageData = ctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            // If mask is white (255), set alpha to 0
            if (maskData.data[i] === 255) {
                imageData.data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        // Put the data back
        ctx.putImageData(imageData, 0, 0);

        // Create a new Fabric Image from the high-res canvas
        fabric.Image.fromURL(srcCanvas.toDataURL('image/png'), newImg => {
            // Preserve all the original image properties
            newImg.set({
                left: activeObject.left,
                top: activeObject.top,
                scaleX: activeObject.scaleX,
                scaleY: activeObject.scaleY,
                angle: activeObject.angle,
                flipX: activeObject.flipX,
                flipY: activeObject.flipY,
                selectable: activeObject.selectable
            });

            // Remove the old image and add the new one
            canvas.remove(activeObject);
            canvas.add(newImg);
            canvas.setActiveObject(newImg);

            // Clean up
            canvas.remove(tempShapeEraserObject);
            tempShapeEraserObject = null;
            shapeEraserStartPoint = null;

            canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
    } else {
        // Not an image, just clean up
        canvas.remove(tempShapeEraserObject);
        tempShapeEraserObject = null;
        shapeEraserStartPoint = null;
    }
}

// Helper functions to create SVG path strings
function createCirclePath(cx, cy, r) {
    return `M ${cx-r},${cy} a ${r},${r} 0 1,0 ${r*2},0 a ${r},${r} 0 1,0 -${r*2},0 z`;
}

function createEllipsePath(cx, cy, rx, ry) {
    return `M ${cx-rx},${cy} a ${rx},${ry} 0 1,0 ${rx*2},0 a ${rx},${ry} 0 1,0 -${rx*2},0 z`;
}

function createRectPath(x, y, w, h) {
    return `M ${x},${y} h ${w} v ${h} h -${w} z`;
}

function createTrianglePath(x, y, w, h) {
    return `M ${x+w/2},${y} L ${x},${y+h} L ${x+w},${y+h} z`;
}

function createPolygonPath(points) {
    if (!points || points.length < 3) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
    }
    path += ' z';
    return path;
}

// Helper function to transform shape coordinates from canvas to image space
function getTransformedShape(shape, targetObject) {
    const transformedShape = fabric.util.object.clone(shape);

    // Get the target object's transformation properties
    const objLeft = targetObject.left;
    const objTop = targetObject.top;
    const objScaleX = targetObject.scaleX;
    const objScaleY = targetObject.scaleY;

    // Calculate position relative to the target object
    if (shape.type === 'circle') {
        transformedShape.left = (shape.left - objLeft) / objScaleX;
        transformedShape.top = (shape.top - objTop) / objScaleY;
        transformedShape.radius = shape.radius / ((objScaleX + objScaleY) / 2);
    }
    else if (shape.type === 'ellipse') {
        transformedShape.left = (shape.left - objLeft) / objScaleX;
        transformedShape.top = (shape.top - objTop) / objScaleY;
        transformedShape.rx = shape.rx / objScaleX;
        transformedShape.ry = shape.ry / objScaleY;
    }
    else if (shape.type === 'rect' || shape.type === 'triangle') {
        transformedShape.left = (shape.left - objLeft) / objScaleX;
        transformedShape.top = (shape.top - objTop) / objScaleY;
        transformedShape.width = shape.width / objScaleX;
        transformedShape.height = shape.height / objScaleY;
    }
    else if (shape.type === 'polygon') {
        transformedShape.points = shape.points.map(point => ({
            x: (point.x - objLeft) / objScaleX,
            y: (point.y - objTop) / objScaleY
        }));
    }

    return transformedShape;
}

// Add these variables at the top of app.js, with your other state variables
let snapRotation = false;
let rotationSnap = 15; // Degrees to snap rotation

// Add this function to handle rotation snapping
function setObjectRotation(angle) {
    if (!activeObject) return;
    
    // Normalize angle to 0-360
    angle = angle % 360;
    if (angle < 0) angle += 360;
    
    // Apply the rotation to the active object
    activeObject.set('angle', angle);
    document.getElementById('rotation-input').value = Math.round(angle);
    canvas.renderAll();
}

// Function to handle rotation with snapping
function rotateWithSnap(angle) {
    if (!activeObject) return;
    
    if (snapRotation) {
        // Snap to nearest increment
        angle = Math.round(angle / rotationSnap) * rotationSnap;
    }
    
    setObjectRotation(angle);
}

// Add event listener to capture rotation events
canvas.on('object:rotating', function(options) {
    if (snapRotation && options.target) {
        const angle = options.target.angle;
        options.target.set('angle', Math.round(angle / rotationSnap) * rotationSnap);
    }
    
    // Update the rotation input field
    if (options.target) {
        document.getElementById('rotation-input').value = Math.round(options.target.angle);
    }
});

// Update the rotation input when an object is selected
canvas.on('selection:created', function(options) {
    if (options.selected && options.selected[0]) {
        document.getElementById('rotation-input').value = Math.round(options.selected[0].angle);
    }
});

canvas.on('selection:updated', function(options) {
    if (options.selected && options.selected[0]) {
        document.getElementById('rotation-input').value = Math.round(options.selected[0].angle);
    }
});

// Function to rotate left by rotationSnap degrees
function rotateLeft() {
    if (!activeObject) return;
    const currentAngle = activeObject.angle || 0;
    rotateWithSnap(currentAngle - rotationSnap);
}

// Function to rotate right by rotationSnap degrees
function rotateRight() {
    if (!activeObject) return;
    const currentAngle = activeObject.angle || 0;
    rotateWithSnap(currentAngle + rotationSnap);
}

// Function to toggle snap rotation
function toggleSnapRotation() {
    snapRotation = !snapRotation;
    document.getElementById('snap-rotation').textContent = 
        snapRotation ? 'Snap: ON' : 'Snap: OFF';
}

// Function to update object rotation from input field
function updateRotationFromInput() {
    if (!activeObject) return;
    const inputValue = document.getElementById('rotation-input').value;
    const angle = parseFloat(inputValue);
    
    if (!isNaN(angle)) {
        setObjectRotation(angle);
    }
}

// Add these lines to your app.js file

// Shape drawing variables
let isDrawingShape = false;
let currentShape = null;
let startPoint = { x: 0, y: 0 };
let currentShapeType = 'rect';
let shapeStrokeWidth = 2;
let shapeStrokeColor = '#000000';
let shapeFillColor = 'rgba(0, 0, 0, 0.3)';

// Function to start shape drawing mode
function startShapeDrawing() {
    // Exit other modes first
    if (canvas.isDrawingMode) {
        togglePaintMode();
    }
    if (bucketMode) {
        toggleBucketMode();
    }

    isDrawingShape = true;
    document.getElementById('shape-controls').style.display = 'block';
    
    // Set cursor
    canvas.defaultCursor = 'crosshair';
    
    // Remove existing event listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    
    // Add shape drawing event listeners
    canvas.on('mouse:down', onShapeMouseDown);
    canvas.on('mouse:move', onShapeMouseMove);
    canvas.on('mouse:up', onShapeMouseUp);
}

// Function to exit shape drawing mode
function exitShapeDrawing() {
    isDrawingShape = false;
    document.getElementById('shape-controls').style.display = 'none';
    
    // Reset cursor
    canvas.defaultCursor = 'default';
    
    // Remove shape drawing event listeners
    canvas.off('mouse:down', onShapeMouseDown);
    canvas.off('mouse:move', onShapeMouseMove);
    canvas.off('mouse:up', onShapeMouseUp);
}

// Shape mouse event handlers
function onShapeMouseDown(options) {
    if (!isDrawingShape) return;
    
    // Get start point
    const pointer = canvas.getPointer(options.e);
    startPoint = { x: pointer.x, y: pointer.y };
    
    // Create initial shape
    switch (currentShapeType) {
        case 'rect':
            currentShape = new fabric.Rect({
                left: startPoint.x,
                top: startPoint.y,
                width: 0,
                height: 0,
                fill: shapeFillColor,
                stroke: shapeStrokeColor,
                strokeWidth: shapeStrokeWidth,
                selectable: false
            });
            break;
        case 'circle':
            currentShape = new fabric.Circle({
                left: startPoint.x,
                top: startPoint.y,
                radius: 0,
                fill: shapeFillColor,
                stroke: shapeStrokeColor,
                strokeWidth: shapeStrokeWidth,
                selectable: false
            });
            break;
        case 'triangle':
            currentShape = new fabric.Triangle({
                left: startPoint.x,
                top: startPoint.y,
                width: 0,
                height: 0,
                fill: shapeFillColor,
                stroke: shapeStrokeColor,
                strokeWidth: shapeStrokeWidth,
                selectable: false
            });
            break;
        case 'line':
            currentShape = new fabric.Line(
                [startPoint.x, startPoint.y, startPoint.x, startPoint.y],
                {
                    stroke: shapeStrokeColor,
                    strokeWidth: shapeStrokeWidth,
                    selectable: false
                }
            );
            break;
        case 'ellipse':
            currentShape = new fabric.Ellipse({
                left: startPoint.x,
                top: startPoint.y,
                rx: 0,
                ry: 0,
                fill: shapeFillColor,
                stroke: shapeStrokeColor,
                strokeWidth: shapeStrokeWidth,
                selectable: false
            });
            break;
        case 'polygon': 
            // For polygon, start with a line from startPoint to startPoint
            currentShape = new fabric.Polygon(
                [
                    { x: startPoint.x, y: startPoint.y },
                    { x: startPoint.x, y: startPoint.y }
                ],
                {
                    fill: shapeFillColor,
                    stroke: shapeStrokeColor,
                    strokeWidth: shapeStrokeWidth,
                    selectable: false
                }
            );
            break;
    }
    
    canvas.add(currentShape);
}

function onShapeMouseMove(options) {
    if (!isDrawingShape || !currentShape) return;
    
    const pointer = canvas.getPointer(options.e);
    
    switch (currentShapeType) {
        case 'rect':
            if (startPoint.x > pointer.x) {
                currentShape.set({ left: pointer.x });
            }
            if (startPoint.y > pointer.y) {
                currentShape.set({ top: pointer.y });
            }
            
            currentShape.set({
                width: Math.abs(startPoint.x - pointer.x),
                height: Math.abs(startPoint.y - pointer.y)
            });
            break;
        
        case 'circle':
            const radius = Math.sqrt(
                Math.pow(startPoint.x - pointer.x, 2) +
                Math.pow(startPoint.y - pointer.y, 2)
            ) / 2;
            
            currentShape.set({
                radius: radius,
                left: startPoint.x - radius,
                top: startPoint.y - radius
            });
            break;
        
        case 'triangle':
            if (startPoint.x > pointer.x) {
                currentShape.set({ left: pointer.x });
            }
            if (startPoint.y > pointer.y) {
                currentShape.set({ top: pointer.y });
            }
            
            currentShape.set({
                width: Math.abs(startPoint.x - pointer.x),
                height: Math.abs(startPoint.y - pointer.y)
            });
            break;
        
        case 'line':
            currentShape.set({
                x2: pointer.x,
                y2: pointer.y
            });
            break;
        
        case 'ellipse':
            const rx = Math.abs(startPoint.x - pointer.x) / 2;
            const ry = Math.abs(startPoint.y - pointer.y) / 2;
            
            currentShape.set({
                rx: rx,
                ry: ry,
                left: Math.min(startPoint.x, pointer.x) + rx,
                top: Math.min(startPoint.y, pointer.y) + ry
            });
            break;
            
        case 'polygon':
            // Update the last point for polygon
            const points = currentShape.get('points');
            points[points.length - 1] = { x: pointer.x, y: pointer.y };
            currentShape.set({ points: points });
            break;
    }
    
    canvas.renderAll();
}

function onShapeMouseUp() {
    if (!isDrawingShape || !currentShape) return;
    
    // Make the shape selectable
    currentShape.set({
        selectable: true,
        evented: true
    });
    
    // Special case for continued polygon drawing
    if (currentShapeType === 'polygon') {
        // Continue with the polygon - keep the shape in drawing mode
        return;
    }
    
    // Reset the current shape
    currentShape = null;
    canvas.renderAll();
}

// Function to add a point to polygon
function addPolygonPoint() {
    if (currentShapeType !== 'polygon' || !currentShape) return;
    
    const points = currentShape.get('points');
    const lastPoint = points[points.length - 1];
    
    // Add a new point that's a copy of the last point
    points.push({ x: lastPoint.x, y: lastPoint.y });
    currentShape.set({ points: points });
    canvas.renderAll();
}

// Function to complete polygon
function completePolygon() {
    if (currentShapeType !== 'polygon' || !currentShape) return;
    
    // Make the polygon selectable
    currentShape.set({
        selectable: true,
        evented: true
    });
    
    // Reset the current shape
    currentShape = null;
    canvas.renderAll();
}

// Set shape type function
function setShapeType(type) {
    currentShapeType = type;
    
    // Show/hide polygon controls
    const polygonControls = document.getElementById('polygon-controls');
    if (polygonControls) {
        polygonControls.style.display = type === 'polygon' ? 'block' : 'none';
    }
    
    // If we had a polygon in progress, complete it
    if (currentShape && currentShapeType !== 'polygon') {
        completePolygon();
    }
}

// Update shape stroke width
function updateShapeStrokeWidth(value) {
    shapeStrokeWidth = parseInt(value);
}

// Update shape stroke color
function updateShapeStrokeColor(value) {
    shapeStrokeColor = value;
}

// Update shape fill color
function updateShapeFillColor(value) {
    shapeFillColor = value;
}
