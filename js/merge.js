const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const previewContainer = document.getElementById('previewContainer');
const processBtn = document.getElementById('processBtn');
const fileCountDisplay = document.getElementById('fileCount');
const statusBox = document.getElementById('statusBox');

let uploadedFiles = []; 

fileInput.addEventListener('change', async (e) => { handleFiles(e.target.files); });
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-blue-100'); });
dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('bg-blue-100'); });
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-blue-100');
    handleFiles(e.dataTransfer.files);
});

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if(validFiles.length > 0) {
        dropZone.style.display = 'none'; 
        
        for(let file of validFiles) {
            uploadedFiles.push(file);
            await renderThumbnail(file, uploadedFiles.length);
        }
        
        fileCountDisplay.innerText = uploadedFiles.length;
        processBtn.disabled = false;
    }
}

async function renderThumbnail(file, index) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    const page = await pdf.getPage(1); 
    
    const scale = 0.5; 
    const viewport = page.getViewport({scale});
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.className = 'pdf-preview bg-white';
    
    await page.render({canvasContext: ctx, viewport: viewport}).promise;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col items-center relative group w-32';
    
    const badge = document.createElement('div');
    badge.className = 'absolute -top-3 -left-3 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md z-10';
    badge.innerText = index;
    
    wrapper.innerHTML = `
        <div class="mt-3 w-full text-center">
            <p class="text-xs font-bold text-gray-700 truncate px-1" title="${file.name}">${file.name}</p>
            <p class="text-xs text-gray-400 mt-1">${pdf.numPages} págs</p>
        </div>
    `;
    wrapper.insertBefore(canvas, wrapper.firstChild);
    wrapper.appendChild(badge);
    
    previewContainer.appendChild(wrapper);
}

processBtn.addEventListener('click', async () => {
    try {
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
        processBtn.disabled = true;
        processBtn.classList.replace('bg-red-600', 'bg-gray-500');

        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (let file of uploadedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfFile = await mergedPdf.save();
        
        const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'PDF_Studio_Unido.pdf';
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        processBtn.innerHTML = '<i class="fas fa-magic mr-2"></i> Unir y Descargar PDF';
        processBtn.disabled = false;
        processBtn.classList.replace('bg-gray-500', 'bg-red-600');
        statusBox.classList.remove('hidden');
        
        setTimeout(() => statusBox.classList.add('hidden'), 5000);

    } catch (error) {
        console.error(error);
        alert('Hubo un error al procesar el documento.');
        processBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i> Reintentar';
        processBtn.disabled = false;
        processBtn.classList.replace('bg-gray-500', 'bg-red-600');
    }
});
