function chunkText(text, chunkSize = 500, overlap = 100) {
    const words = text.split(/\s+/);  // split by whitespace into words
    const chunks = [];
    let i = 0;

    while (i < words.length) {
        // take chunkSize words starting from i
        const chunk = words.slice(i, i + chunkSize).join(" ");
        chunks.push(chunk);
        // move forward by (chunkSize - overlap) so next chunk shares 'overlap' words
        i += chunkSize - overlap;
    }

    return chunks;
}

module.exports = { chunkText };