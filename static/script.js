// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;
const icon = themeToggle.querySelector('i');

// Check saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    icon.classList.replace('fa-moon', 'fa-sun');
}

themeToggle.addEventListener('click', () => {
    if (root.hasAttribute('data-theme')) {
        root.removeAttribute('data-theme');
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'light');
    } else {
        root.setAttribute('data-theme', 'dark');
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'dark');
    }
});

// --- Module 1: Symptom Checker ---
const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const resetSymptomBtn = document.getElementById('reset-symptom-btn');

let answers = {};
let currentStep = 0;

const questions = [
    {
        id: 'body_part',
        text: "In which part of the body did the injury occur?",
        type: 'text'
    },
    {
        id: 'pain_level',
        text: "On a scale of 1 to 10, how severe is your pain?",
        type: 'slider',
        min: 1, max: 10
    },
    {
        id: 'swelling',
        text: "Is there any visible swelling?",
        type: 'options',
        options: ['Yes', 'No']
    },
    {
        id: 'can_move',
        text: "Can you move the injured area normally?",
        type: 'options',
        options: ['Yes', 'No']
    },
    {
        id: 'bruising',
        text: "Is there any discoloration or bruising?",
        type: 'options',
        options: ['Yes', 'No']
    },
    {
        id: 'deformity',
        text: "Does the area look visibly deformed or out of place?",
        type: 'options',
        options: ['Yes', 'No']
    },
    {
        id: 'injury_type',
        text: "How did the injury occur?",
        type: 'options',
        options: ['Fall', 'Twist', 'Hit', 'Other']
    }
];

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(sender === 'bot' ? 'bot-msg' : 'user-msg');
    
    // Convert newlines to breaks
    msgDiv.innerHTML = text.replace(/\n/g, '<br>');
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function renderInput() {
    inputArea.innerHTML = '';
    
    if (currentStep >= questions.length) {
        submitSymptoms();
        return;
    }

    const q = questions[currentStep];
    addMessage(q.text, 'bot');

    if (q.type === 'slider') {
        const container = document.createElement('div');
        container.className = 'slider-container';
        
        const output = document.createElement('div');
        output.style.textAlign = 'center';
        output.style.fontWeight = 'bold';
        output.style.marginBottom = '10px';
        output.innerText = 'Value: 5';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = q.min;
        slider.max = q.max;
        slider.value = 5;
        
        slider.oninput = function() {
            output.innerText = 'Value: ' + this.value;
        }
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.style.width = '100%';
        btn.style.marginTop = '15px';
        btn.innerText = 'Confirm';
        btn.onclick = () => {
            handleAnswer(slider.value);
        };
        
        container.appendChild(output);
        container.appendChild(slider);
        
        const labels = document.createElement('div');
        labels.className = 'slider-labels';
        labels.innerHTML = `<span>Mild</span><span>Severe</span>`;
        container.appendChild(labels);
        
        container.appendChild(btn);
        inputArea.appendChild(container);
    } 
    else if (q.type === 'options') {
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            btn.innerText = opt;
            btn.onclick = () => {
                handleAnswer(opt);
            };
            inputArea.appendChild(btn);
        });
    }
    else if (q.type === 'text') {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '10px';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'btn-option';
        input.style.cursor = 'text';
        input.placeholder = 'e.g. Left knee, right shoulder...';
        
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.innerText = 'Send';
        btn.onclick = () => {
            if (input.value.trim() !== '') {
                handleAnswer(input.value.trim());
            }
        };
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btn.click();
        });
        
        container.appendChild(input);
        container.appendChild(btn);
        inputArea.appendChild(container);
        
        // Auto-focus input
        setTimeout(() => input.focus(), 100);
    }
}

function handleAnswer(val) {
    const q = questions[currentStep];
    answers[q.id] = val;
    addMessage(val.toString(), 'user');
    
    currentStep++;
    inputArea.innerHTML = '';
    
    setTimeout(() => {
        renderInput();
    }, 500);
}

async function submitSymptoms() {
    addMessage("Analyzing your symptoms...", 'bot');
    
    try {
        const response = await fetch('/predict_symptoms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(answers)
        });
        
        const data = await response.json();
        
        let riskClass = 'risk-low';
        if (data.risk_score === 'High') riskClass = 'risk-high';
        else if (data.risk_score === 'Medium') riskClass = 'risk-medium';
        
        let resultHtml = `
            <strong>Assessment Complete</strong><br>
            <span class="${riskClass}">Risk Level: ${data.risk_score}</span><br>
            Likely Injury: ${data.likely_injury}<br><br>
            <strong>First Aid Advice:</strong><br>
            ${data.first_aid_advice}
        `;
        
        if (data.visit_doctor_urgently) {
            resultHtml += `<br><br><span class="risk-high"><i class="fas fa-exclamation-triangle"></i> Please seek immediate medical attention!</span>`;
        }
        
        setTimeout(() => {
            addMessage(resultHtml, 'bot');
            resetSymptomBtn.style.display = 'block';
        }, 800);
        
    } catch (error) {
        addMessage("Error processing assessment. Please try again.", 'bot');
        resetSymptomBtn.style.display = 'block';
    }
}

resetSymptomBtn.addEventListener('click', () => {
    chatBox.innerHTML = '';
    answers = {};
    currentStep = 0;
    resetSymptomBtn.style.display = 'none';
    
    addMessage("Hello! I'm your AI injury assistant. Let's evaluate your symptoms.", 'bot');
    setTimeout(renderInput, 500);
});

// Initialize Chat
addMessage("Hello! I'm your AI injury assistant. Let's evaluate your symptoms.", 'bot');
setTimeout(renderInput, 1000);


// --- Module 2: Image Analysis ---
const uploadZone = document.getElementById('upload-zone');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const uploadContent = document.querySelector('.upload-content');
const analyzeImgBtn = document.getElementById('analyze-img-btn');
const resetImgBtn = document.getElementById('reset-img-btn');
const imageResult = document.getElementById('image-result');
const imageLoading = document.getElementById('image-loading');
const imageResultContent = document.getElementById('image-result-content');

let selectedFile = null;

// Handle drag & drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
});

uploadZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
});

uploadZone.addEventListener('click', () => {
    imageUpload.click();
});

imageUpload.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        selectedFile = files[0];
        
        // Check if it's an image
        if (!selectedFile.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            uploadContent.classList.add('hidden');
            analyzeImgBtn.disabled = false;
            resetImgBtn.classList.remove('hidden');
        }
        reader.readAsDataURL(selectedFile);
    }
}

resetImgBtn.addEventListener('click', () => {
    selectedFile = null;
    imageUpload.value = '';
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    uploadContent.classList.remove('hidden');
    analyzeImgBtn.disabled = true;
    resetImgBtn.classList.add('hidden');
    imageResult.classList.add('hidden');
});

analyzeImgBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    
    imageResult.classList.remove('hidden');
    imageLoading.classList.remove('hidden');
    imageResultContent.innerHTML = '';
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    
    try {
        const response = await fetch('/predict_image', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        imageLoading.classList.add('hidden');
        
        if (data.error) {
            imageResultContent.innerHTML = `<div class="risk-high"><i class="fas fa-exclamation-circle"></i> Error: ${data.error}</div>`;
            return;
        }
        
        // Render Result
        let riskClass = data.confidence > 70 ? 'risk-high' : 'risk-medium';
        if (data.result === "No major visible issue") riskClass = 'risk-low';
        
        imageResultContent.innerHTML = `
            <div class="result-header ${riskClass}">
                <i class="fas fa-poll"></i> Analysis Result
            </div>
            <p><strong>Detected:</strong> ${data.result}</p>
            <p><strong>Confidence:</strong> ${data.confidence}%</p>
            <div class="advice-box">
                <i class="fas fa-info-circle"></i> ${data.recommendation}
            </div>
        `;
        
    } catch (error) {
        imageLoading.classList.add('hidden');
        imageResultContent.innerHTML = `<div class="risk-high"><i class="fas fa-exclamation-circle"></i> Connection error. Try again.</div>`;
    }
});
