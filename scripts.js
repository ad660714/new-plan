let db;
const DB_NAME = 'FitnessAppDB';
const PROGRESS_STORE = 'progress';
const WEIGHT_STORE = 'weight';
const EQUIPMENT_STORE = 'equipment';
const EXERCISE_STORE = 'exercises';
let weightChart, bodyWeightChart;
let timerInterval;

const ACHIEVEMENTS = {
    'squat10': { name: '深蹲大师', desc: '完成10次深蹲', unlocked: false },
    '30days': { name: '铁人30天', desc: '坚持训练30天', unlocked: false }
};

function initDB() {
    const request = indexedDB.open(DB_NAME, 4);
    request.onupgradeneeded = event => {
        db = event.target.result;
        const stores = ['progress', 'weight', 'equipment', 'exercises'];
        stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            }
        });
    };
    request.onsuccess = event => {
        db = event.target.result;
        if (document.getElementById('training-table')) renderTrainingPlan();
        renderProgressCharts();
        displayTrainingRecords();
        displayEquipmentRecords();
        displayMeasurementRecords();
    };
    request.onerror = event => console.error('IndexedDB 初始化失败:', event.target.error);
}

function calculateBMI(weight, height) {
    if (weight && height) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        const bmiElement = document.getElementById('bmi');
        if (bmiElement) bmiElement.textContent = `BMI: ${bmi}`;
    } else {
        const bmiElement = document.getElementById('bmi');
        if (bmiElement) bmiElement.textContent = 'BMI: 未记录';
    }
}

function renderTrainingPlan() {
    const defaultDays = [
        { day: '周一', focus: '胸部', exercises: [
            { name: '杠铃卧推', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7' },
            { name: '哑铃上斜推', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pF' },
            { name: '蝴蝶机夹胸', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pG' }
        ]},
        { day: '周二', focus: '背部', exercises: [
            { name: '杠铃划船', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h8' },
            { name: '引体向上', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pI' },
            { name: '坐姿划船机', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pJ' }
        ]},
        { day: '周三', focus: '腿部', exercises: [
            { name: '杠铃深蹲', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h9' },
            { name: '腿举机', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pL' },
            { name: '腿部伸展机', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pM' }
        ]},
        { day: '周四', focus: '肩部', exercises: [
            { name: '杠铃推举', video: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7hA' },
            { name: '哑铃侧平举', video: 'https://player.bilibili.com/player.html?bvid=BV1x5411k7pO' },
            { name: '哑铃前平举', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pP' }
        ]},
        { day: '周五', focus: '手臂', exercises: [
            { name: '哑铃二头弯举', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pK' },
            { name: '杠铃三头下压', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pH' },
            { name: '仰卧臂屈伸', video: 'https://player.bilibili.com/player.html?bvid=BV1v5411k7pQ' }
        ]},
        { day: '周六', rest: true },
        { day: '周日', rest: true }
    ];

    const today = new Date().toLocaleDateString('zh-CN', { weekday: 'long' }).replace('星期', '周');
    const todayPlan = defaultDays.find(d => d.day === today) || { day: today, rest: true };

    const exerciseTx = db.transaction([EXERCISE_STORE], 'readonly');
    const exerciseStore = exerciseTx.objectStore(EXERCISE_STORE);
    const exerciseRequest = exerciseStore.getAll();

    exerciseRequest.onsuccess = () => {
        const customExercises = exerciseRequest.result.map(e => ({
            name: e.name,
            video: e.video,
            day: e.day
        }));

        const days = defaultDays.map(day => {
            if (day.rest) return day;
            const customForDay = customExercises.filter(e => e.day === day.day);
            return {
                ...day,
                exercises: [...day.exercises, ...customForDay]
            };
        });

        const todayTrainingDiv = document.getElementById('today-training');
        todayTrainingDiv.innerHTML = `
            <h3>今日训练 (${today})</h3>
            <button class="exercise" onclick="toggleTodayDetails()">展开详情</button>
            <div id="today-details" class="details" aria-hidden="true">
                <p>${todayPlan.rest ? '休息日 - 建议进行轻度活动或完全休息。' : `${todayPlan.focus}`}</p>
            </div>
        `;

        if (!todayPlan.rest) {
            const detailsDiv = document.getElementById('today-details');
            const fitnessLevel = 'intermediate'; // 默认中级
            const goal = 'muscle'; // 默认增肌
            const sets = { beginner: 3, intermediate: 3, advanced: 4 }[fitnessLevel];
            const reps = { muscle: '8-12', strength: '4-6', endurance: '12-15' }[goal];
            const rest = { beginner: 120, intermediate: 90, advanced: 60 }[fitnessLevel];

            const todayExercises = days.find(d => d.day === today).exercises;
            todayExercises.forEach((exercise, i) => {
                const id = `today_exercise_${i}`;
                detailsDiv.innerHTML += `
                    <button class="exercise" onclick="toggleDetails('${id}')">${exercise.name}</button>
                    <div id="${id}" class="details">
                        <p>组数：${sets} 组 x ${reps} 次，休息 ${rest} 秒</p>
                        <form class="progress-form" onsubmit="saveProgress(event, '${exercise.name}')">
                            <input type="number" name="weight" placeholder="本次重量 (kg)" required>
                            <input type="number" name="reps" placeholder="完成次数" required>
                            <input type="number" name="equipment-weight" placeholder="器械重量 (kg)" step="0.5">
                            <button type="submit">记录</button>
                        </form>
                        <div id="progress_${id}"></div>
                        ${exercise.video ? `
                            <button class="exercise" onclick="toggleVideo('${id}')">查看示范</button>
                            <div id="video_${id}" class="video-container" style="display: none;">
                                <iframe width="560" height="315" src="${exercise.video}" scrolling="no" border="0" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
                            </div>
                        ` : ''}
                        <button class="exercise" onclick="editExercise('${exercise.name}', '${exercise.day}')">编辑动作</button>
                        <button class="exercise" onclick="deleteExercise('${exercise.name}', '${exercise.day}')">删除动作</button>
                    </div>
                `;
            });
        }
    };
}

function toggleTodayDetails() {
    const details = document.getElementById('today-details');
    if (details) {
        const isHidden = details.getAttribute('aria-hidden') === 'true';
        details.setAttribute('aria-hidden', !isHidden);
    }
}

function toggleVideo(id) {
    const videoDiv = document.getElementById(`video_${id}`);
    if (videoDiv) {
        const currentDisplay = videoDiv.style.display;
        videoDiv.style.display = currentDisplay === 'none' ? 'block' : 'none';
        if (currentDisplay === 'none') {
            const iframe = videoDiv.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
        }
    }
}

function toggleDetails(id) {
    const details = document.getElementById(id);
    if (details) {
        const isHidden = details.getAttribute('aria-hidden') === 'true';
        details.setAttribute('aria-hidden', !isHidden);
        if (!isHidden) {
            const restTime = 90; // 默认中级休息时间
            startTimer(restTime, details.querySelector('button').textContent);
        } else {
            clearInterval(timerInterval);
        }
    }
}

function saveProgress(event, exerciseName) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const weight = parseFloat(formData.get('weight'));
    const reps = parseInt(formData.get('reps'));
    const equipmentWeight = parseFloat(formData.get('equipment-weight')) || 0;
    const date = new Date().toISOString().split('T')[0];

    if (!weight || isNaN(weight) || !reps || isNaN(reps) || weight <= 0 || reps <= 0) {
        alert('请正确填写重量和次数！');
        return;
    }

    const progressRecord = { exercise: exerciseName, weight, reps, equipmentWeight, date };
    const transaction = db.transaction([PROGRESS_STORE], 'readwrite');
    const store = transaction.objectStore(PROGRESS_STORE);
    store.add(progressRecord);

    const equipmentTx = db.transaction([EQUIPMENT_STORE], 'readwrite');
    const equipmentStore = equipmentTx.objectStore(EQUIPMENT_STORE);
    equipmentStore.add({ exercise: exerciseName, equipmentWeight, date });

    transaction.oncomplete = () => {
        alert('训练记录已保存！');
        event.target.reset();
        renderProgressCharts();
        checkAchievements();
        displayTrainingRecords();
        displayEquipmentRecords();
    };
}

function saveWeight(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const weight = parseFloat(formData.get('weight'));
    const date = formData.get('date');
    const chest = parseFloat(formData.get('chest'));
    const waist = parseFloat(formData.get('waist'));
    const hip = parseFloat(formData.get('hip'));
    const height = parseFloat(formData.get('height')); // 新增身高输入

    if (!weight || isNaN(weight) || weight <= 0 || !date) {
        alert('请正确填写体重和日期！');
        return;
    }

    const measurementRecord = { weight, date, chest, waist, hip, height };
    if (isNaN(chest) || isNaN(waist) || isNaN(hip) || isNaN(height)) {
        measurementRecord.chest = chest || null;
        measurementRecord.waist = waist || null;
        measurementRecord.hip = hip || null;
        measurementRecord.height = height || null;
    }

    const transaction = db.transaction([WEIGHT_STORE], 'readwrite');
    const store = transaction.objectStore(WEIGHT_STORE);
    store.add(measurementRecord);

    transaction.oncomplete = () => {
        alert('体重和三围记录已保存！');
        event.target.reset();
        calculateBMI(weight, height);
        renderProgressCharts();
        displayMeasurementRecords();
    };
}

function displayMeasurementRecords() {
    const weightTx = db.transaction([WEIGHT_STORE], 'readonly');
    const store = weightTx.objectStore(WEIGHT_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
        const records = request.result;
        const recordsDiv = document.getElementById('measurement-records');
        if (recordsDiv) {
            recordsDiv.innerHTML = '<h3>体重与三围记录</h3>' + (records.length ? records.map(r => `
                <p>${r.date}: 体重: ${r.weight}kg${r.height ? `, 身高: ${r.height}cm` : ''}${r.chest ? `, 胸围: ${r.chest}cm` : ''}${r.waist ? `, 腰围: ${r.waist}cm` : ''}${r.hip ? `, 臀围: ${r.hip}cm` : ''}</p>
            `).join('') : '<p>暂无记录</p>');
        }
    };
}

function clearProgress() {
    if (confirm('确定清除所有记录吗？')) {
        const transaction = db.transaction([WEIGHT_STORE, PROGRESS_STORE, EQUIPMENT_STORE, EXERCISE_STORE], 'readwrite');
        transaction.objectStore(WEIGHT_STORE).clear();
        transaction.objectStore(PROGRESS_STORE).clear();
        transaction.objectStore(EQUIPMENT_STORE).clear();
        transaction.objectStore(EXERCISE_STORE).clear();
        transaction.oncomplete = () => {
            alert('记录已清除！');
            location.reload();
        };
    }
}

function renderProgressCharts() {
    const weightTx = db.transaction([WEIGHT_STORE], 'readonly');
    const weightStore = weightTx.objectStore(WEIGHT_STORE);
    const weightRequest = weightStore.getAll();

    weightRequest.onsuccess = () => {
        const weightData = weightRequest.result.map(w => ({ x: new Date(w.date), y: w.weight }));
        const range = document.getElementById('weight-range')?.value || 'all';
        const filteredData = filterDataByRange(weightData, range);

        if (bodyWeightChart) bodyWeightChart.destroy();
        const canvas = document.getElementById('bodyWeightChart');
        if (canvas) {
            bodyWeightChart = new Chart(canvas, {
                type: 'line',
                data: { datasets: [{ label: '体重 (kg)', data: filteredData, borderColor: '#007BFF', fill: false }] },
                options: {
                    scales: {
                        x: { type: 'time', title: { display: true, text: '日期' } },
                        y: { title: { display: true, text: '体重 (kg)' }, beginAtZero: false }
                    }
                }
            });
        }
    };
}

function filterDataByRange(data, range) {
    const now = new Date();
    return data.filter(item => {
        const date = new Date(item.x);
        switch (range) {
            case '7d': return (now - date) <= 7 * 24 * 60 * 60 * 1000;
            case '1m': return (now - date) <= 30 * 24 * 60 * 60 * 1000;
            case '6m': return (now - date) <= 6 * 30 * 24 * 60 * 60 * 1000;
            case '1y': return (now - date) <= 12 * 30 * 24 * 60 * 60 * 1000;
            default: return true;
        }
    });
}

function displayTrainingRecords() {
    const progressTx = db.transaction([PROGRESS_STORE], 'readonly');
    const store = progressTx.objectStore(PROGRESS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
        const records = request.result;
        const recordsDiv = document.getElementById('training-records');
        if (recordsDiv) {
            recordsDiv.innerHTML = '<h3>训练记录</h3>' + (records.length ? records.map(r => `
                <p>${r.date}: ${r.exercise} - 重量: ${r.weight}kg, 次数: ${r.reps}${r.equipmentWeight ? `, 器械重量: ${r.equipmentWeight}kg` : ''}</p>
            `).join('') : '<p>暂无训练记录</p>');
        }
    };
}

function displayEquipmentRecords() {
    const equipmentTx = db.transaction([EQUIPMENT_STORE], 'readonly');
    const store = equipmentTx.objectStore(EQUIPMENT_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
        const records = request.result;
        const recordsDiv = document.getElementById('equipment-records') || document.createElement('div');
        recordsDiv.id = 'equipment-records';
        recordsDiv.innerHTML = '<h3>器械重量记录</h3>' + (records.length ? records.map(r => `
            <p>${r.date}: ${r.exercise} - 器械重量: ${r.equipmentWeight}kg</p>
        `).join('') : '<p>暂无器械重量记录</p>');
        document.querySelector('.container').appendChild(recordsDiv);
    };
}

function checkAchievements() {
    const progressTx = db.transaction([PROGRESS_STORE], 'readonly');
    const store = progressTx.objectStore(PROGRESS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
        const records = request.result;
        if (records.some(r => r.exercise === '杠铃深蹲' && r.reps >= 10)) ACHIEVEMENTS.squat10.unlocked = true;
        const daysTrained = new Set(records.map(r => r.date)).size;
        if (daysTrained >= 30) ACHIEVEMENTS['30days'].unlocked = true;

        displayAchievements();
    };
}

function displayAchievements() {
    const achDiv = document.getElementById('achievements') || document.createElement('div');
    achDiv.id = 'achievements';
    achDiv.innerHTML = '<h3>成就</h3>' + Object.values(ACHIEVEMENTS)
        .map(a => `<p>${a.name}: ${a.unlocked ? '✅ ' + a.desc : '🔒 ' + a.desc}</p>`)
        .join('');
    document.querySelector('.container').appendChild(achDiv);
}

function startTimer(duration, exerciseName) {
    let timeLeft = duration;
    const timerDisplay = document.getElementById('timer') || document.createElement('div');
    timerDisplay.id = 'timer';
    document.querySelector('.container').appendChild(timerDisplay);

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerDisplay.textContent = `休息时间：${timeLeft} 秒`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.remove();
        }
        timeLeft--;
    }, 1000);
}

function analyzeTrainingProgress() {
    const weightTx = db.transaction([WEIGHT_STORE], 'readonly');
    const weightStore = weightTx.objectStore(WEIGHT_STORE);
    const weightRequest = weightStore.getAll();

    weightRequest.onsuccess = () => {
        const weights = weightRequest.result.map(w => w.weight);
        if (weights.length < 2) return;

        const trend = (weights[weights.length - 1] - weights[0]) / (weights.length - 1);
        let suggestion = '';

        if (trend > 0.5) {
            suggestion = '恭喜！你的体重增加，建议增加训练重量。';
        } else if (trend < -0.5) {
            suggestion = '体重下降，可能是训练不足，建议增加训练强度或休息。';
        } else {
            suggestion = '体重稳定，保持当前计划，继续努力！';
        }

        const suggestionDiv = document.getElementById('training-suggestion');
        if (suggestionDiv) {
            suggestionDiv.innerHTML = `<p>${suggestion}</p>`;
            suggestionDiv.setAttribute('aria-hidden', 'false');
        }
    };
}

function addExercise(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const name = formData.get('exercise-name');
    const video = formData.get('exercise-video');
    const day = formData.get('exercise-day');

    if (!name || !day) {
        alert('请填写动作名称和训练日！');
        return;
    }

    const exerciseRecord = { name, video, day };
    const transaction = db.transaction([EXERCISE_STORE], 'readwrite');
    const store = transaction.objectStore(EXERCISE_STORE);
    store.add(exerciseRecord);

    transaction.oncomplete = () => {
        alert('训练动作已添加！');
        event.target.reset();
        renderTrainingPlan();
    };
}

function editExercise(name, day) {
    const transaction = db.transaction([EXERCISE_STORE], 'readonly');
    const store = transaction.objectStore(EXERCISE_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
        const exercises = request.result;
        const exercise = exercises.find(e => e.name === name && e.day === day);

        if (exercise) {
            const newName = prompt('请输入新的动作名称：', exercise.name);
            const newVideo = prompt('请输入新的示范视频链接（可选）：', exercise.video || '');
            const newDay = prompt('请输入新的训练日（周一至周日）：', exercise.day);

            if (newName && newDay) {
                const transaction = db.transaction([EXERCISE_STORE], 'readwrite');
                const store = transaction.objectStore(EXERCISE_STORE);
                store.put({ ...exercise, name: newName, video: newVideo, day: newDay });
                transaction.oncomplete = () => {
                    alert('训练动作已更新！');
                    renderTrainingPlan();
                };
            }
        } else {
            alert('无法编辑默认动作！');
        }
    };
}

function deleteExercise(name, day) {
    if (confirm('确定删除此训练动作吗？')) {
        const transaction = db.transaction([EXERCISE_STORE], 'readwrite');
        const store = transaction.objectStore(EXERCISE_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            const exercises = request.result;
            const exercise = exercises.find(e => e.name === name && e.day === day);

            if (exercise) {
                store.delete(exercise.id);
                transaction.oncomplete = () => {
                    alert('训练动作已删除！');
                    renderTrainingPlan();
                };
            } else {
                alert('无法删除默认动作！');
            }
        };
    }
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(() => {
        console.log('Service Worker 注册成功');
    });
}

window.addEventListener('load', initDB);