// 在 window.addEventListener('load', initDB) 后添加
window.addEventListener('load', () => {
    initDB();
    // 自动渲染今日训练计划
    if (document.getElementById('today-training')) {
        renderTrainingPlan();
    }
});

// 修改 renderTrainingPlan 函数，适配 index.html
function renderTrainingPlan() {
    const defaultDays = [
        // ... 保持原有数据 ...
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
            ${todayPlan.rest ? '<p>休息日 - 建议进行轻度活动或完全休息。</p>' : ''}
        `;

        if (!todayPlan.rest) {
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'details';
            detailsDiv.id = 'today-details';
            detailsDiv.setAttribute('aria-hidden', 'true');

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
                    <div id="${id}" class="details" aria-hidden="true">
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
                    </div>
                `;
            });

            todayTrainingDiv.appendChild(detailsDiv);
            todayTrainingDiv.innerHTML += `
                <button class="exercise" onclick="toggleTodayDetails()">展开所有详情</button>
            `;
        }
    };
}

// 确保 toggleTodayDetails 函数存在
function toggleTodayDetails() {
    const details = document.getElementById('today-details');
    if (details) {
        const isHidden = details.getAttribute('aria-hidden') === 'true';
        details.setAttribute('aria-hidden', !isHidden);
    }
}