import { env, SamModel, AutoProcessor, RawImage, Tensor, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;

// We adopt the singleton pattern to enable lazy-loading of the model and processor.
export class transformersSingleton {
    static model_id = 'Xenova/slimsam-77-uniform';
    static model;
    static processor;
    static pipeline;
    static quantized = true;

    static getInstance() {
        if (!this.model) {
            this.model = SamModel.from_pretrained(this.model_id, {
                quantized: this.quantized,
            });
        }
        if (!this.processor) {
            this.processor = AutoProcessor.from_pretrained(this.model_id);
        }
        if (!this.pipeline) {
            this.pipeline = pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
        }

        return Promise.all([this.model, this.processor, this.pipeline]);
    }
}


// State variables
let image_embeddings = null;
let image_inputs = null;
let ready = false;
let fullDecodeMasks = [];
let image;
let upscaler;
let segmentModel, maskProcessor, depthPipe;

self.onmessage = async (e) => {
    const { type, data } = e.data;
    console.log(type, ' || ')
    // const [model, processor, pipeline] = await transformersSingleton.getInstance();
    if (!ready) {
        // Indicate that we are ready to accept requests
        ready = true;
    }

    if (type === 'reset') {
        image_inputs = null;
        image_embeddings = null;

    } else if (type === 'segment') {
        if (!segmentModel || !maskProcessor) await init()
        self.postMessage({
            type: 'segment_result',
            data: 'start',
        });

        // Read the image and recompute image embeddings
        image = await RawImage.read(e.data.data);
        image_inputs = await maskProcessor(image);
        image_embeddings = await segmentModel.get_image_embeddings(image_inputs)

        // Indicate that we have computed the image embeddings, and we are ready to accept decoding requests
        self.postMessage({
            type: 'segment_result',
            data: 'done',
        });
    } else if (type === 'decode') {
        for (const d of data) {
            // Prepare inputs for decoding
            const reshaped = image_inputs.reshaped_input_sizes[0];
            const points = [[d.point[0] * reshaped[1], d.point[1] * reshaped[0]]]
            const labels = [BigInt(d.label)]

            const input_points = new Tensor(
                'float32',
                points.flat(Infinity),
                [1, 1, points.length, 2],
            )
            const input_labels = new Tensor(
                'int64',
                labels.flat(Infinity),
                [1, 1, labels.length],
            )

            // Generate the mask
            const outputs = await segmentModel({
                ...image_embeddings,
                input_points,
                input_labels,
            })

            // Post-process the mask
            const masks = await maskProcessor.post_process_masks(
                outputs.pred_masks,
                image_inputs.original_sizes,
                image_inputs.reshaped_input_sizes,
            );

            self.postMessage({
                type: 'decode_result',
                data: {mask: RawImage.fromTensor(masks[0][0]), scores: outputs.iou_scores.data},
            });
        }
    } else if (type === 'depth') {
        if (!depthPipe) await init()
        const res = await depthPipe(data);
        self.postMessage({
            type: 'depth_result',
            data: res.depth.data
        })
    } else if (type === 'upscale') {
        if (!upscaler) {
            upscaler = await pipeline('image-to-image', 'Xenova/swin2SR-lightweight-x2-64')
        }
        const start = performance.now()
        const result = await upscaler(data)
        self.postMessage({
            type: 'upscale_result',
            data: result
        })
        const tt = (performance.now() - start) / 1000
        console.log('upscale time: ', tt, 's')
    } else {
        throw new Error(`Unknown message type: ${type}`);
    }
}

async function init() {
    [segmentModel, maskProcessor, depthPipe] = await transformersSingleton.getInstance();
    console.log('init this shit')
}