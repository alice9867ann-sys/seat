/**
 * submit.js
 * UI 이벤트 바인딩, 동적 렌더링, 3D 카드 플립 연출, Confetti 애니메이션, 이미지 내보내기 및 인쇄 제어 모듈
 */

document.addEventListener('DOMContentLoaded', () => {
  // 전역 인스턴스 참조
  const cm = window.classManager;
  const sfx = window.SoundFX;

  // ==========================================
  // 1. Confetti (꽃가루 폭죽) 애니메이션 엔진
  // ==========================================
  const ConfettiEngine = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,

    init() {
      this.canvas = document.getElementById('confettiCanvas');
      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
      }
    },

    resize() {
      if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    },

    fire(duration = 2500) {
      if (!this.canvas) this.init();
      if (!this.ctx) return;

      const colors = ['#FF6B8B', '#FFD166', '#06D6A0', '#118AB2', '#9B89ED', '#FF9F1C', '#48CAE4'];
      const count = 90;

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: window.innerWidth * (0.3 + Math.random() * 0.4),
          y: window.innerHeight * 0.5,
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.9) * 18,
          size: Math.random() * 10 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          opacity: 1
        });
      }

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.4; // 중력
          p.rotation += p.rotationSpeed;
          p.opacity -= 0.008;

          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = Math.max(0, p.opacity);
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          this.ctx.restore();

          if (p.opacity <= 0 || p.y > window.innerHeight) {
            this.particles.splice(i, 1);
          }
        }

        if (this.particles.length > 0 && elapsed < duration + 2000) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          this.particles = [];
        }
      };

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.animationId = requestAnimationFrame(animate);
    }
  };

  ConfettiEngine.init();

  // ==========================================
  // 2. 상태 및 DOM 엘리먼트 캐싱
  // ==========================================
  let selectedSeatForSwap = null; // 자리 맞바꾸기용 선택 좌석 인덱스
  let isRevealingSeats = false;    // 뽑기 애니메이션 진행 중 여부

  // 탭 네비게이션
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-content-pane');

  // 명단 관리 엘리먼트
  const studentNamesInput = document.getElementById('studentNamesInput');
  const studentCountBadge = document.getElementById('studentCountBadge');
  const classNameInput = document.getElementById('classNameInput');
  const btnApplyNames = document.getElementById('btnApplyNames');
  const btnLoadSample = document.getElementById('btnLoadSample');
  const btnLoadNumbered = document.getElementById('btnLoadNumbered');
  const btnClearNames = document.getElementById('btnClearNames');

  // 조건 설정 엘리먼트
  const frontRowChipsContainer = document.getElementById('frontRowChipsContainer');
  const selectStudentA = document.getElementById('selectStudentA');
  const selectStudentB = document.getElementById('selectStudentB');
  const btnAddSeparatePair = document.getElementById('btnAddSeparatePair');
  const separatePairsList = document.getElementById('separatePairsList');

  // 자리 배치 설정 엘리먼트
  const inputRows = document.getElementById('inputRows');
  const inputCols = document.getElementById('inputCols');
  const totalDesksBadge = document.getElementById('totalDesksBadge');
  const checkPairMode = document.getElementById('checkPairMode');
  const selectViewMode = document.getElementById('selectViewMode');
  const btnDrawSeats = document.getElementById('btnDrawSeats');
  const btnResetSeats = document.getElementById('btnResetSeats');
  const seatGridContainer = document.getElementById('seatGridContainer');
  const seatingMessage = document.getElementById('seatingMessage');
  const teacherDeskLabel = document.getElementById('teacherDeskLabel');

  // 모둠 편성 엘리먼트
  const inputGroupCount = document.getElementById('inputGroupCount');
  const checkAssignLeader = document.getElementById('checkAssignLeader');
  const btnDrawGroups = document.getElementById('btnDrawGroups');
  const btnResetGroups = document.getElementById('btnResetGroups');
  const groupCardsContainer = document.getElementById('groupCardsContainer');
  const groupMessage = document.getElementById('groupMessage');
  const btnCopyGroupText = document.getElementById('btnCopyGroupText');

  // 요약 & 출력 엘리먼트
  const summaryTitle = document.getElementById('summaryTitle');
  const summarySeatGrid = document.getElementById('summarySeatGrid');
  const summaryGroupList = document.getElementById('summaryGroupList');
  const btnPrintA4 = document.getElementById('btnPrintA4');
  const btnDownloadImage = document.getElementById('btnDownloadImage');

  // 토스트 알림 헬퍼
  const showToast = (msg, type = 'info') => {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'toast-alert';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast-alert show ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.className = 'toast-alert';
    }, 2800);
  };

  // ==========================================
  // 3. 탭 네비게이션 제어
  // ==========================================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.click();
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(targetTab);
      if (activePane) activePane.classList.add('active');

      // 탭 전환 시 필요 데이터 갱신
      if (targetTab === 'tab-summary') {
        renderSummaryView();
      } else if (targetTab === 'tab-seating') {
        updateSeatingGridPreview();
      }
    });
  });

  // ==========================================
  // 4. 명단 관리 로직
  // ==========================================
  function updateStudentCountDisplay() {
    const parsed = cm.parseTextInput(studentNamesInput.value);
    const count = parsed.length;
    studentCountBadge.textContent = `총 ${count}명`;
    studentCountBadge.style.backgroundColor = count > 0 ? '#FFE0E6' : '#F1F5F9';
    studentCountBadge.style.color = count > 0 ? '#FF3E6C' : '#64748B';
  }

  function syncNamesInputWithManager() {
    studentNamesInput.value = cm.students.map(s => s.name).join('\n');
    updateStudentCountDisplay();
    renderConstraintOptions();
    updateSeatingGridPreview();
  }

  studentNamesInput.addEventListener('input', () => {
    updateStudentCountDisplay();
  });

  classNameInput.addEventListener('input', (e) => {
    cm.className = e.target.value || '우리 반';
    if (summaryTitle) summaryTitle.textContent = `${cm.className} 자리 & 모둠 배치표`;
  });

  btnApplyNames.addEventListener('click', () => {
    sfx.click();
    const names = cm.parseTextInput(studentNamesInput.value);
    if (names.length === 0) {
      showToast('⚠️ 학생 이름을 1명 이상 입력해 주세요!', 'warning');
      return;
    }
    cm.setStudentsFromNames(names);
    syncNamesInputWithManager();
    showToast(`✅ ${cm.getStudentCount()}명의 명단이 저장되었습니다!`, 'success');
  });

  btnLoadSample.addEventListener('click', () => {
    sfx.click();
    cm.loadSample();
    syncNamesInputWithManager();
    showToast(`🌸 예시 명단(24명)을 불러왔습니다!`, 'success');
  });

  btnLoadNumbered.addEventListener('click', () => {
    sfx.click();
    const count = parseInt(inputRows.value, 10) * parseInt(inputCols.value, 10) || 24;
    cm.loadNumbered(count);
    syncNamesInputWithManager();
    showToast(`🔢 1번~${count}번 명단을 생성했습니다!`, 'success');
  });

  btnClearNames.addEventListener('click', () => {
    sfx.click();
    if (confirm('정말 학생 명단을 모두 비우시겠습니까?')) {
      cm.setStudentsFromNames([]);
      studentNamesInput.value = '';
      updateStudentCountDisplay();
      renderConstraintOptions();
      updateSeatingGridPreview();
      showToast('🗑️ 명단이 초기화되었습니다.', 'info');
    }
  });

  // ==========================================
  // 5. 조건 설정 렌더링 및 이벤트
  // ==========================================
  function renderConstraintOptions() {
    // 1) 앞자리 지정 학생 칩 렌더링
    frontRowChipsContainer.innerHTML = '';
    if (cm.students.length === 0) {
      frontRowChipsContainer.innerHTML = '<span class="empty-tip">등록된 학생이 없습니다. 먼저 명단을 등록해 주세요.</span>';
    } else {
      cm.students.forEach(student => {
        const chip = document.createElement('button');
        chip.type = 'button';
        const isSelected = cm.constraints.frontRowStudents.has(student.id);
        chip.className = `filter-chip ${isSelected ? 'active' : ''}`;
        chip.innerHTML = `${isSelected ? '⭐ ' : ''}${student.name}`;
        chip.addEventListener('click', () => {
          sfx.click();
          cm.toggleFrontRow(student.id);
          renderConstraintOptions();
        });
        frontRowChipsContainer.appendChild(chip);
      });
    }

    // 2) 분리 필요 학생 선택 드롭다운 갱신
    selectStudentA.innerHTML = '<option value="">학생 A 선택</option>';
    selectStudentB.innerHTML = '<option value="">학생 B 선택</option>';
    cm.students.forEach(student => {
      const optA = document.createElement('option');
      optA.value = student.id;
      optA.textContent = student.name;
      selectStudentA.appendChild(optA);

      const optB = document.createElement('option');
      optB.value = student.id;
      optB.textContent = student.name;
      selectStudentB.appendChild(optB);
    });

    // 3) 현재 등록된 분리 쌍 리스트 렌더링
    separatePairsList.innerHTML = '';
    if (cm.constraints.separatedPairs.length === 0) {
      separatePairsList.innerHTML = '<li class="empty-pair">지정된 분리 조건이 없습니다.</li>';
    } else {
      cm.constraints.separatedPairs.forEach(([idA, idB], idx) => {
        const stdA = cm.getStudentById(idA);
        const stdB = cm.getStudentById(idB);
        if (stdA && stdB) {
          const li = document.createElement('li');
          li.className = 'pair-item';
          li.innerHTML = `
            <span class="pair-text">🚫 <strong>${stdA.name}</strong> ↔ <strong>${stdB.name}</strong> (나란히 앉기 방지)</span>
            <button type="button" class="btn-remove-pair" data-idx="${idx}" title="삭제">✕</button>
          `;
          li.querySelector('.btn-remove-pair').addEventListener('click', () => {
            sfx.click();
            cm.removeSeparatedPair(idx);
            renderConstraintOptions();
          });
          separatePairsList.appendChild(li);
        }
      });
    }
  }

  btnAddSeparatePair.addEventListener('click', () => {
    sfx.click();
    const idA = selectStudentA.value;
    const idB = selectStudentB.value;
    if (!idA || !idB) {
      showToast('⚠️ 두 학생을 모두 선택해 주세요.', 'warning');
      return;
    }
    if (idA === idB) {
      showToast('⚠️ 서로 다른 두 학생을 선택해야 합니다.', 'warning');
      return;
    }

    const added = cm.addSeparatedPair(idA, idB);
    if (added) {
      renderConstraintOptions();
      selectStudentA.value = '';
      selectStudentB.value = '';
      showToast('🚫 분리 조건이 추가되었습니다!', 'info');
    } else {
      showToast('이미 등록된 분리 조건입니다.', 'warning');
    }
  });

  // ==========================================
  // 6. 자리 배치 설정 및 실시간 그리드 렌더링
  // ==========================================
  function updateDeskCountBadge() {
    const rows = parseInt(inputRows.value, 10) || 4;
    const cols = parseInt(inputCols.value, 10) || 6;
    const total = rows * cols;
    cm.seatConfig.rows = rows;
    cm.seatConfig.cols = cols;
    totalDesksBadge.textContent = `총 ${total}석 (학생 ${cm.getStudentCount()}명)`;
    if (total < cm.getStudentCount()) {
      totalDesksBadge.style.backgroundColor = '#FEE2E2';
      totalDesksBadge.style.color = '#EF4444';
    } else {
      totalDesksBadge.style.backgroundColor = '#DCFCE7';
      totalDesksBadge.style.color = '#15803D';
    }
  }

  inputRows.addEventListener('change', () => {
    updateDeskCountBadge();
    updateSeatingGridPreview();
  });

  inputCols.addEventListener('change', () => {
    updateDeskCountBadge();
    updateSeatingGridPreview();
  });

  checkPairMode.addEventListener('change', (e) => {
    sfx.click();
    cm.seatConfig.pairMode = e.target.checked;
    updateSeatingGridPreview();
  });

  selectViewMode.addEventListener('change', (e) => {
    sfx.click();
    cm.seatConfig.viewMode = e.target.value;
    teacherDeskLabel.textContent = cm.seatConfig.viewMode === 'teacher' 
      ? '👩‍🏫 교탁 / 칠판 (선생님 시점)' 
      : '👨‍🎓 칠판 (학생 시점)';
    updateSeatingGridPreview();
  });

  // 빈 자리 레이아웃 미리보기 또는 현재 배치 렌더링
  function updateSeatingGridPreview(animateFlip = false) {
    const rows = cm.seatConfig.rows;
    const cols = cm.seatConfig.cols;
    const isPair = cm.seatConfig.pairMode;
    const isStudentView = cm.seatConfig.viewMode === 'student';

    seatGridContainer.style.setProperty('--grid-cols', cols);
    seatGridContainer.className = `seat-grid ${isPair ? 'pair-layout' : 'single-layout'}`;
    seatGridContainer.innerHTML = '';

    // 아직 뽑기가 진행되지 않았거나 크기가 바뀌었으면 임시 레이아웃 생성
    if (cm.seatLayout.length !== rows * cols) {
      cm.seatLayout = [];
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cm.seatLayout.push({
            index: idx++,
            row: r,
            col: c,
            student: null
          });
        }
      }
    }

    // 뷰포트 시점에 따른 행 렌더링 순서
    const rowIndices = [];
    if (isStudentView) {
      // 학생 시점: 맨 뒷줄이 화면 아래, 칠판 바로 앞이 맨 위 (동일하지만 열 순서 좌우반전 가능)
      for (let r = 0; r < rows; r++) rowIndices.push(r);
    } else {
      for (let r = 0; r < rows; r++) rowIndices.push(r);
    }

    // 그리드 아이템 렌더링
    cm.seatLayout.forEach((seat, i) => {
      const card = document.createElement('div');
      card.className = `seat-card ${seat.student ? 'occupied' : 'empty'}`;
      card.setAttribute('data-seat-index', i);

      // 짝꿍 모드일 때 열 간격 스타일 적용 (짝수 열마다 통로 여백)
      if (isPair && seat.col % 2 === 1 && seat.col !== cols - 1) {
        card.classList.add('pair-aisle-right');
      }

      // 카드 내부 3D 플립 구조
      const hasStudent = !!seat.student;
      const isFrontStudent = hasStudent && cm.constraints.frontRowStudents.has(seat.student.id);

      const cardInner = document.createElement('div');
      cardInner.className = 'card-inner';

      // 카드 앞면 (숨김/물음표 상태)
      const cardFront = document.createElement('div');
      cardFront.className = 'card-face card-front';
      cardFront.innerHTML = `
        <span class="seat-num">${seat.row + 1}-${seat.col + 1}</span>
        <span class="mystery-icon">🎁</span>
        <span class="card-hint">두근두근</span>
      `;

      // 카드 뒷면 (학생 이름 표시)
      const cardBack = document.createElement('div');
      cardBack.className = `card-face card-back ${isFrontStudent ? 'is-front-student' : ''}`;
      
      if (hasStudent) {
        cardBack.innerHTML = `
          <div class="card-desk-top">
            <span class="seat-tag">${seat.row + 1}줄 ${seat.col + 1}칸</span>
            ${isFrontStudent ? '<span class="front-badge" title="앞자리 지정 학생">⭐앞자리</span>' : ''}
          </div>
          <div class="student-avatar-wrap">
            <span class="student-avatar">${getAvatarEmoji(seat.student.name)}</span>
          </div>
          <div class="student-name">${seat.student.name}</div>
          <div class="card-desk-bottom">
            <button type="button" class="btn-swap-seat" title="다른 자리와 교환">⇄ 맞바꾸기</button>
          </div>
        `;
      } else {
        cardBack.innerHTML = `
          <div class="card-desk-top">
            <span class="seat-tag">${seat.row + 1}줄 ${seat.col + 1}칸</span>
          </div>
          <div class="empty-desk-icon">🪑</div>
          <div class="empty-desk-text">빈 책상</div>
        `;
      }

      cardInner.appendChild(cardFront);
      cardInner.appendChild(cardBack);
      card.appendChild(cardInner);

      // 애니메이션 플립 효과 적용
      if (animateFlip && hasStudent) {
        card.classList.add('is-flipping');
        setTimeout(() => {
          card.classList.remove('is-flipping');
          card.classList.add('is-flipped');
          sfx.flip();
        }, i * 65 + 150); // 순차적 캐스케이드 딜레이
      } else if (hasStudent) {
        card.classList.add('is-flipped');
      }

      // 자리 맞바꾸기(Swap) 클릭 이벤트
      card.addEventListener('click', (e) => {
        if (isRevealingSeats) return;
        handleSeatClick(i, card);
      });

      seatGridContainer.appendChild(card);
    });

    if (selectedSeatForSwap !== null) {
      highlightSelectedSeat(selectedSeatForSwap);
    }
  }

  // 귀여운 아바타 이모지 생성기
  function getAvatarEmoji(name) {
    const emojis = ['🐥', '🐶', '🐱', '🐰', '🐻', '🐼', '🦊', '🐨', '🐯', '🦁', '🐸', '🐹'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % emojis.length;
    return emojis[index];
  }

  // 자리 맞바꾸기 (선생님 수동 조정 기능)
  function handleSeatClick(seatIndex, cardElement) {
    if (selectedSeatForSwap === null) {
      selectedSeatForSwap = seatIndex;
      cardElement.classList.add('swap-selected');
      sfx.click();
      const std = cm.seatLayout[seatIndex].student;
      const name = std ? std.name : '빈 책상';
      showToast(`[${name}] 자리가 선택되었습니다. 바꿀 다른 자리를 클릭하세요!`, 'info');
    } else if (selectedSeatForSwap === seatIndex) {
      // 선택 취소
      selectedSeatForSwap = null;
      document.querySelectorAll('.seat-card').forEach(c => c.classList.remove('swap-selected'));
      sfx.click();
      showToast('자리 선택이 취소되었습니다.', 'info');
    } else {
      // 맞바꾸기 실행
      sfx.flip();
      cm.swapSeats(selectedSeatForSwap, seatIndex);
      const prevIndex = selectedSeatForSwap;
      selectedSeatForSwap = null;
      document.querySelectorAll('.seat-card').forEach(c => c.classList.remove('swap-selected'));
      updateSeatingGridPreview(false);
      showToast('🔄 두 자리가 맞바뀌었습니다!', 'success');
    }
  }

  function highlightSelectedSeat(index) {
    const card = seatGridContainer.querySelector(`[data-seat-index="${index}"]`);
    if (card) card.classList.add('swap-selected');
  }

  // ==========================================
  // 7. '자리 뽑기' 버튼 실행 & 극적 연출
  // ==========================================
  btnDrawSeats.addEventListener('click', () => {
    if (isRevealingSeats) return;

    if (cm.getStudentCount() === 0) {
      showToast('⚠️ 학생 명단이 없습니다. 먼저 명단을 등록해 주세요!', 'warning');
      return;
    }

    const rows = parseInt(inputRows.value, 10) || 4;
    const cols = parseInt(inputCols.value, 10) || 6;
    if (rows * cols < cm.getStudentCount()) {
      showToast(`⚠️ 책상 수(${rows * cols}석)가 학생 수(${cm.getStudentCount()}명)보다 적습니다!`, 'warning');
      return;
    }

    isRevealingSeats = true;
    btnDrawSeats.disabled = true;
    btnDrawSeats.innerHTML = '<span class="spinner"></span> 두근두근 뽑는 중...';
    seatingMessage.innerHTML = '✨ <strong>미스터리 박스가 열리는 중입니다!</strong> 잠시만 기다려 주세요...';
    seatingMessage.className = 'status-box status-loading';

    sfx.shuffle();

    // 1단계: 먼저 모든 카드를 뒤집힌 물음표 상태(Card Front)로 리셋
    cm.seatConfig.rows = rows;
    cm.seatConfig.cols = cols;

    // 자리 알고리즘 실행
    const result = cm.generateSeatAllocation();

    // 빈 카드들로 그리드 초기화
    seatGridContainer.innerHTML = '';
    const total = rows * cols;
    for (let i = 0; i < total; i++) {
      const card = document.createElement('div');
      card.className = 'seat-card';
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-face card-front shaking">
            <span class="mystery-icon">🎁</span>
            <span class="card-hint">두근두근!</span>
          </div>
          <div class="card-face card-back"></div>
        </div>
      `;
      seatGridContainer.appendChild(card);
    }

    // 2단계: 800ms 긴장감 딜레이 후 순차적으로 카드 뒤집기 애니메이션 시작
    setTimeout(() => {
      updateSeatingGridPreview(true);

      const totalDelay = total * 65 + 600;
      setTimeout(() => {
        isRevealingSeats = false;
        btnDrawSeats.disabled = false;
        btnDrawSeats.innerHTML = '🎲 새로운 자리 다시 뽑기';

        seatingMessage.innerHTML = `🎉 <strong>자리 배치 완료!</strong> ${result.message}`;
        seatingMessage.className = result.foundConstraintMatch ? 'status-box status-success' : 'status-box status-warning';

        sfx.fanfare();
        ConfettiEngine.fire(3000);
        showToast('🎉 축하합니다! 새로운 자리가 모두 정해졌습니다!', 'success');
      }, totalDelay);
    }, 800);
  });

  btnResetSeats.addEventListener('click', () => {
    sfx.click();
    cm.seatLayout = [];
    selectedSeatForSwap = null;
    updateSeatingGridPreview(false);
    seatingMessage.innerHTML = '새로운 자리 뽑기를 진행해 보세요!';
    seatingMessage.className = 'status-box';
    showToast('자리 배치 상태가 초기화되었습니다.', 'info');
  });

  // ==========================================
  // 8. 모둠 편성 로직 및 렌더링
  // ==========================================
  btnDrawGroups.addEventListener('click', () => {
    sfx.click();
    if (cm.getStudentCount() === 0) {
      showToast('⚠️ 학생 명단이 없습니다. 먼저 명단을 등록해 주세요!', 'warning');
      return;
    }

    const groupCount = parseInt(inputGroupCount.value, 10) || 4;
    cm.groupConfig.groupCount = groupCount;
    cm.groupConfig.assignLeader = checkAssignLeader.checked;

    sfx.shuffle();

    // 셔플 및 모둠 생성
    const result = cm.generateGroupAllocation();
    if (!result.success) {
      showToast(result.message, 'warning');
      return;
    }

    renderGroups();

    sfx.fanfare();
    ConfettiEngine.fire(2500);
    groupMessage.innerHTML = `✨ <strong>총 ${groupCount}개 모둠으로 균등하게 편성되었습니다!</strong> (총 ${cm.getStudentCount()}명)`;
    groupMessage.className = 'status-box status-success';
    showToast('🎉 새로운 모둠이 성공적으로 편성되었습니다!', 'success');
  });

  btnResetGroups.addEventListener('click', () => {
    sfx.click();
    cm.groups = [];
    groupCardsContainer.innerHTML = '<div class="empty-notice">상단의 [모둠 편성하기] 버튼을 누르면 귀여운 모둠 카드가 생성됩니다! 🐾</div>';
    groupMessage.innerHTML = '모둠 수와 옵션을 설정하고 편성해 보세요!';
    groupMessage.className = 'status-box';
  });

  function renderGroups() {
    groupCardsContainer.innerHTML = '';

    cm.groups.forEach((group, gIdx) => {
      const card = document.createElement('div');
      card.className = 'group-card pop-in';
      card.style.animationDelay = `${gIdx * 100}ms`;
      card.style.borderColor = group.badgeColor;

      const header = document.createElement('div');
      header.className = 'group-card-header';
      header.style.backgroundColor = group.color;
      header.innerHTML = `
        <div class="group-title-row">
          <span class="group-icon">${group.icon}</span>
          <span class="group-name" style="color: ${group.badgeColor};">${group.name}</span>
        </div>
        <span class="group-count-tag" style="background: ${group.badgeColor}; color: #fff;">${group.members.length}명</span>
      `;

      const body = document.createElement('div');
      body.className = 'group-card-body';

      const memberList = document.createElement('ul');
      memberList.className = 'group-member-list';

      group.members.forEach(member => {
        const isLeader = member.id === group.leaderId;
        const li = document.createElement('li');
        li.className = `group-member-item ${isLeader ? 'is-leader' : ''}`;
        li.innerHTML = `
          <div class="member-info">
            <span class="member-avatar">${getAvatarEmoji(member.name)}</span>
            <span class="member-name">${member.name}</span>
          </div>
          ${isLeader 
            ? `<span class="leader-badge" title="클릭하여 모둠장 변경 가능">👑 모둠장(이끄미)</span>` 
            : `<button type="button" class="btn-make-leader" title="이 학생을 모둠장으로 지정">👑</button>`
          }
        `;

        const btnMakeLeader = li.querySelector('.btn-make-leader');
        if (btnMakeLeader) {
          btnMakeLeader.addEventListener('click', () => {
            sfx.click();
            cm.setGroupLeader(group.id, member.id);
            renderGroups();
            showToast(`${group.name}의 모둠장이 [${member.name}] 학생으로 변경되었습니다!`, 'info');
          });
        }

        memberList.appendChild(li);
      });

      body.appendChild(memberList);
      card.appendChild(header);
      card.appendChild(body);
      groupCardsContainer.appendChild(card);
    });
  }

  // 모둠 텍스트 복사 (알림장, 메신저용)
  btnCopyGroupText.addEventListener('click', () => {
    sfx.click();
    if (cm.groups.length === 0) {
      showToast('⚠️ 복사할 모둠 편성 결과가 없습니다.', 'warning');
      return;
    }

    let text = `📋 [${cm.className} 모둠 편성 결과]\n\n`;
    cm.groups.forEach(g => {
      const leader = g.members.find(m => m.id === g.leaderId);
      const memberNames = g.members.map(m => m.name + (m.id === g.leaderId ? '(👑모둠장)' : '')).join(', ');
      text += `${g.icon} ${g.name} (${g.members.length}명): ${memberNames}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 모둠 명단이 클립보드에 복사되었습니다! (알림장 등에 붙여넣기 하세요)', 'success');
    }).catch(() => {
      showToast('클립보드 복사 권한이 필요합니다.', 'warning');
    });
  });

  // ==========================================
  // 9. 요약 화면 렌더링 및 출력 / 이미지 저장
  // ==========================================
  function renderSummaryView() {
    summaryTitle.textContent = `🏫 ${cm.className} 학급 자리 배치 및 모둠 편성표`;

    // 1) 자리 배치 요약 표
    summarySeatGrid.innerHTML = '';
    const rows = cm.seatConfig.rows;
    const cols = cm.seatConfig.cols;

    summarySeatGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    if (cm.seatLayout.length === 0) {
      summarySeatGrid.innerHTML = '<div class="summary-empty">아직 자리 배치가 진행되지 않았습니다. [자리 배치] 탭에서 자리를 뽑아주세요!</div>';
    } else {
      cm.seatLayout.forEach(seat => {
        const item = document.createElement('div');
        item.className = 'summary-seat-cell';
        if (seat.student) {
          const isFront = cm.constraints.frontRowStudents.has(seat.student.id);
          item.innerHTML = `
            <div class="summary-seat-pos">${seat.row + 1}-${seat.col + 1}</div>
            <div class="summary-seat-name">${seat.student.name}</div>
            ${isFront ? '<span class="summary-star">⭐</span>' : ''}
          `;
        } else {
          item.classList.add('is-empty');
          item.innerHTML = `
            <div class="summary-seat-pos">${seat.row + 1}-${seat.col + 1}</div>
            <div class="summary-seat-name empty">빈자리</div>
          `;
        }
        summarySeatGrid.appendChild(item);
      });
    }

    // 2) 모둠 편성 요약 리스트
    summaryGroupList.innerHTML = '';
    if (cm.groups.length === 0) {
      summaryGroupList.innerHTML = '<div class="summary-empty">아직 모둠이 편성되지 않았습니다. [모둠 편성] 탭에서 모둠을 뽑아주세요!</div>';
    } else {
      cm.groups.forEach(g => {
        const groupBox = document.createElement('div');
        groupBox.className = 'summary-group-box';
        groupBox.style.backgroundColor = g.color;
        groupBox.style.borderLeft = `5px solid ${g.badgeColor}`;

        const membersHtml = g.members.map(m => {
          const isL = m.id === g.leaderId;
          return `<span class="summary-member-tag ${isL ? 'leader' : ''}">${isL ? '👑 ' : ''}${m.name}</span>`;
        }).join('');

        groupBox.innerHTML = `
          <div class="summary-group-title">
            <span>${g.icon} ${g.name} (${g.members.length}명)</span>
          </div>
          <div class="summary-group-members">
            ${membersHtml}
          </div>
        `;
        summaryGroupList.appendChild(groupBox);
      });
    }
  }

  // A4 바로 인쇄
  btnPrintA4.addEventListener('click', () => {
    sfx.click();
    window.print();
  });

  // HTML5 Canvas를 이용한 고해상도 PNG 이미지 저장
  btnDownloadImage.addEventListener('click', () => {
    sfx.click();
    if (cm.seatLayout.length === 0) {
      showToast('⚠️ 저장할 자리 배치 결과가 없습니다. 먼저 자리를 뽑아주세요!', 'warning');
      return;
    }

    const rows = cm.seatConfig.rows;
    const cols = cm.seatConfig.cols;

    // 캔버스 크기 계산 (고화질 Retina 2x)
    const scale = 2;
    const cellWidth = 140 * scale;
    const cellHeight = 90 * scale;
    const gapX = 16 * scale;
    const gapY = 16 * scale;
    const padding = 40 * scale;
    const headerHeight = 150 * scale;

    const width = padding * 2 + cols * cellWidth + (cols - 1) * gapX;
    const height = padding * 2 + headerHeight + rows * cellHeight + (rows - 1) * gapY + (cm.groups.length > 0 ? 180 * scale : 0);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1) 부드러운 파스텔 배경
    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, width, height);

    // 2) 헤더 타이틀 및 날짜
    ctx.fillStyle = '#2D3748';
    ctx.font = `bold ${28 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`🏫 ${cm.className} 자리 배치표`, width / 2, 50 * scale);

    const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.font = `${14 * scale}px sans-serif`;
    ctx.fillStyle = '#718096';
    ctx.fillText(`배치 일자: ${todayStr} | 총원: ${cm.getStudentCount()}명`, width / 2, 78 * scale);

    // 3) 교탁 / 칠판 표시 박스
    const boardWidth = Math.min(width * 0.6, 420 * scale);
    const boardHeight = 36 * scale;
    const boardX = (width - boardWidth) / 2;
    const boardY = 96 * scale;

    ctx.fillStyle = '#4A5568';
    roundRect(ctx, boardX, boardY, boardWidth, boardHeight, 10 * scale);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${16 * scale}px sans-serif`;
    ctx.fillText('👩‍🏫 교탁 / 칠판', width / 2, boardY + 24 * scale);

    // 4) 책상 그리드 렌더링
    const startY = headerHeight + padding;
    cm.seatLayout.forEach(seat => {
      const x = padding + seat.col * (cellWidth + gapX);
      const y = startY + seat.row * (cellHeight + gapY);

      // 책상 카드 배경
      const hasStudent = !!seat.student;
      ctx.fillStyle = hasStudent ? '#FFFFFF' : '#EDF2F7';
      roundRect(ctx, x, y, cellWidth, cellHeight, 12 * scale);
      ctx.fill();

      // 테두리
      ctx.strokeStyle = hasStudent ? '#E2E8F0' : '#CBD5E1';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // 책상 번호 라벨 (작게)
      ctx.fillStyle = '#A0AEC0';
      ctx.font = `${11 * scale}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${seat.row + 1}-${seat.col + 1}`, x + 10 * scale, y + 20 * scale);

      // 학생 이름
      if (hasStudent) {
        const isFront = cm.constraints.frontRowStudents.has(seat.student.id);
        if (isFront) {
          ctx.fillStyle = '#FF6B8B';
          ctx.font = `${10 * scale}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText('⭐앞자리', x + cellWidth - 10 * scale, y + 20 * scale);
        }

        ctx.fillStyle = '#2D3748';
        ctx.font = `bold ${20 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(seat.student.name, x + cellWidth / 2, y + 55 * scale);
      } else {
        ctx.fillStyle = '#A0AEC0';
        ctx.font = `${14 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('빈 책상', x + cellWidth / 2, y + 55 * scale);
      }
    });

    // 5) 모둠 편성 결과 요약 (있을 경우 하단에 부가)
    if (cm.groups.length > 0) {
      const groupStartY = startY + rows * (cellHeight + gapY) + 20 * scale;
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(padding, groupStartY, width - padding * 2, 2 * scale);

      ctx.fillStyle = '#2D3748';
      ctx.font = `bold ${16 * scale}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('🐾 모둠 편성 요약', padding, groupStartY + 28 * scale);

      const groupColWidth = (width - padding * 2) / Math.min(4, cm.groups.length);
      cm.groups.forEach((g, idx) => {
        const gx = padding + (idx % 4) * groupColWidth;
        const gy = groupStartY + 45 * scale + Math.floor(idx / 4) * 55 * scale;
        
        ctx.fillStyle = '#4A5568';
        ctx.font = `bold ${13 * scale}px sans-serif`;
        ctx.fillText(`${g.icon} ${g.name}:`, gx, gy);

        ctx.font = `${12 * scale}px sans-serif`;
        ctx.fillStyle = '#718096';
        const memberList = g.members.map(m => m.name + (m.id === g.leaderId ? '(👑)' : '')).join(', ');
        ctx.fillText(memberList, gx, gy + 18 * scale);
      });
    }

    // 이미지 다운로드 트리거
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${cm.className}_자리배치표_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();

    showToast('📸 고화질 배치표 이미지가 다운로드되었습니다!', 'success');
  });

  // Canvas 둥근 모서리 사각형 유틸리티
  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ==========================================
  // 10. 초기화 실행
  // ==========================================
  syncNamesInputWithManager();
  updateDeskCountBadge();
  updateSeatingGridPreview(false);
});
