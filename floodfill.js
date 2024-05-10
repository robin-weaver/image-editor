self.onmessage = function(e) {
    const { imageData, startX, startY, fillColor, targetColor, width, height, bucketThreshold } = e.data;

    function colorsMatch(color1, color2, tolerance) {
        return Math.abs(color1[0] - color2[0]) <= tolerance &&
            Math.abs(color1[1] - color2[1]) <= tolerance &&
            Math.abs(color1[2] - color2[2]) <= tolerance &&
            Math.abs(color1[3] - color2[3]) <= tolerance;
    }

    const visited = new Uint8Array(width * height);
    const data = imageData.data;

    // Flood Fill
    const queue = [{x: startX, y: startY}];
    while (queue.length) {
        const {x: currentX, y: currentY} = queue.shift();
        if (currentX < 0 || currentX >= width || currentY < 0 || currentY >= height) continue;
        const index = (currentY * width + currentX) * 4;
        if (visited[currentY * width + currentX]) continue;

        const currentColor = data.slice(index, index + 4);  // [r, g, b, a]
        if (!colorsMatch(currentColor, targetColor, bucketThreshold)) continue;

        data[index] = fillColor[0];
        data[index + 1] = fillColor[1];
        data[index + 2] = fillColor[2];
        data[index + 3] = fillColor[3];
        visited[currentY * width + currentX] = 1;

        queue.push({x: currentX + 1, y: currentY});
        queue.push({x: currentX - 1, y: currentY});
        queue.push({x: currentX, y: currentY + 1});
        queue.push({x: currentX, y: currentY - 1});
    }

    self.postMessage({ imageData });
}