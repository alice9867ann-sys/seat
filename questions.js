/**
 * questions.js
 * 학급 자리 배치 및 모둠 편성 앱의 데이터 모델, 제약 조건 해결 알고리즘, 오디오 효과음 모듈
 */

// ==========================================
// 1. 사운드 효과 모듈 (Web Audio API 기반 합성)
// ==========================================
const SoundFX = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  },

  playTone(freq, type = 'sine', duration = 0.1, delay = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },

  click() {
    this.playTone(600, 'sine', 0.05);
  },

  flip() {
    this.playTone(420, 'triangle', 0.08);
  },

  shuffle() {
    const freqs = [350, 440, 520, 660];
    freqs.forEach((f, i) => {
      this.playTone(f, 'sine', 0.06, i * 0.04);
    });
  },

  fanfare() {
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },       // C5
      { f: 659.25, d: 0.12, t: 0.12 },    // E5
      { f: 783.99, d: 0.14, t: 0.24 },    // G5
      { f: 1046.50, d: 0.35, t: 0.38 }    // C6
    ];
    notes.forEach(n => {
      this.playTone(n.f, 'triangle', n.d, n.t);
    });
  }
};

// ==========================================
// 2. 학급 데이터 및 알고리즘 관리자 (ClassSeatManager)
// ==========================================
class ClassSeatManager {
  constructor() {
    // 기본 친근한 초등학생 예시 명단 (24명)
    this.sampleStudents = [
      '김민준', '이서연', '박도윤', '정하은', '최시우', '강지우',
      '조주원', '윤서윤', '장예준', '임윤서', '한지호', '오채원',
      '배선우', '송수아', '권도현', '신유나', '황예은', '안지환',
      '홍채은', '전유찬', '백소율', '유도경', '서시은', '고태윤'
    ];

    // 상태값
    this.students = [];
    this.className = '1학년 4반';
    
    // 자리 배치 설정
    this.seatConfig = {
      rows: 4,               // 줄 수 (행)
      cols: 6,               // 칸 수 (열)
      pairMode: true,        // 짝꿍 모드 (2열씩 붙여서 통로 생성)
      viewMode: 'teacher',   // 'teacher' (선생님 시점) or 'student' (학생 시점)
      revealSpeed: 'cascade' // 'cascade' (순차 뒤집기) or 'all' (한 번에 뒤집기)
    };

    // 제약 조건
    this.constraints = {
      frontRowStudents: new Set(), // 앞자리(1~2열) 필수 학생 ID 목록
      separatedPairs: []           // 절대 옆자리에 붙으면 안 되는 학생 쌍 [[idA, idB], ...]
    };

    // 모둠 편성 설정
    this.groupConfig = {
      groupCount: 4,         // 모둠 수
      assignLeader: true,    // 모둠장(이끄미) 자동 배정 여부
      themes: [
        { name: '토끼 모둠', icon: '🐰', color: '#FFE3EC', badgeColor: '#FF6B8B' },
        { name: '곰돌이 모둠', icon: '🐻', color: '#FFF3D6', badgeColor: '#F5A623' },
        { name: '병아리 모둠', icon: '🐥', color: '#FEF9C3', badgeColor: '#EAB308' },
        { name: '야옹이 모둠', icon: '🐱', color: '#EDE9FE', badgeColor: '#8B5CF6' },
        { name: '댕댕이 모둠', icon: '🐶', color: '#E0F2FE', badgeColor: '#0EA5E9' },
        { name: '여우 모둠', icon: '🦊', color: '#FFEDD5', badgeColor: '#F97316' },
        { name: '판다 모둠', icon: '🐼', color: '#DCFCE7', badgeColor: '#10B981' },
        { name: '다람쥐 모둠', icon: '🐿️', color: '#FEE2E2', badgeColor: '#EF4444' }
      ]
    };

    // 현재 배치 결과
    this.seatLayout = [];  // [ { index, row, col, student: { id, name, number } | null } ]
    this.groups = [];      // [ { id, name, icon, color, badgeColor, leaderId, members: [] } ]

    // 초기 명단 로드
    this.loadSample();
  }

  // 1. 명단 관리 메서드
  loadSample() {
    this.setStudentsFromNames(this.sampleStudents);
  }

  loadNumbered(count = 24) {
    const names = [];
    for (let i = 1; i <= count; i++) {
      names.push(`${i}번 학생`);
    }
    this.setStudentsFromNames(names);
  }

  setStudentsFromNames(namesList) {
    this.students = namesList
      .map(name => name.trim())
      .filter(name => name.length > 0)
      .map((name, idx) => ({
        id: `std_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        name: name,
        number: idx + 1
      }));

    // 제약조건 중 명단에서 삭제된 학생 정리
    const validIds = new Set(this.students.map(s => s.id));
    this.constraints.frontRowStudents = new Set(
      [...this.constraints.frontRowStudents].filter(id => validIds.has(id))
    );
    this.constraints.separatedPairs = this.constraints.separatedPairs.filter(
      ([a, b]) => validIds.has(a) && validIds.has(b)
    );
  }

  parseTextInput(text) {
    if (!text) return [];
    // 쉼표, 줄바꿈, 세미콜론, 탭으로 분리
    const rawNames = text.split(/[\n,;\t]+/);
    return rawNames.map(n => n.trim()).filter(n => n.length > 0);
  }

  getStudentCount() {
    return this.students.length;
  }

  getStudentById(id) {
    return this.students.find(s => s.id === id) || null;
  }

  // 2. 제약 조건 관리
  toggleFrontRow(studentId) {
    if (this.constraints.frontRowStudents.has(studentId)) {
      this.constraints.frontRowStudents.delete(studentId);
    } else {
      this.constraints.frontRowStudents.add(studentId);
    }
  }

  addSeparatedPair(studentIdA, studentIdB) {
    if (!studentIdA || !studentIdB || studentIdA === studentIdB) return false;
    
    // 이미 존재하는지 확인 (순서 무관)
    const exists = this.constraints.separatedPairs.some(([a, b]) => 
      (a === studentIdA && b === studentIdB) || (a === studentIdB && b === studentIdA)
    );
    if (!exists) {
      this.constraints.separatedPairs.push([studentIdA, studentIdB]);
      return true;
    }
    return false;
  }

  removeSeparatedPair(index) {
    if (index >= 0 && index < this.constraints.separatedPairs.length) {
      this.constraints.separatedPairs.splice(index, 1);
      return true;
    }
    return false;
  }

  // 3. 자리 배치 알고리즘 (제약 조건 충족 및 랜덤 배치)
  generateSeatAllocation() {
    const totalDesks = this.seatConfig.rows * this.seatConfig.cols;
    const studentList = [...this.students];

    if (studentList.length > totalDesks) {
      return {
        success: false,
        message: `좌석 수(${totalDesks}석)가 학생 수(${studentList.length}명)보다 적습니다. 줄 수 또는 칸 수를 늘려주세요!`
      };
    }

    // 셔플 유틸리티 (Fisher-Yates)
    const shuffle = (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // 제약 조건 검증 함수
    const checkConstraints = (grid) => {
      // 1) 절대 옆자리에 붙지 않아야 하는 조건 검증
      for (const [idA, idB] of this.constraints.separatedPairs) {
        let posA = null;
        let posB = null;

        for (let r = 0; r < this.seatConfig.rows; r++) {
          for (let c = 0; c < this.seatConfig.cols; c++) {
            const student = grid[r][c];
            if (student && student.id === idA) posA = { r, c };
            if (student && student.id === idB) posB = { r, c };
          }
        }

        if (posA && posB) {
          // 같은 행에서 바로 옆자리인지 확인
          if (posA.r === posB.r && Math.abs(posA.c - posB.c) === 1) {
            // 짝꿍 모드일 경우: 같은 짝꿍 블록(0,1), (2,3), (4,5)에 나란히 앉은 경우 특히 엄격하게 금지
            if (this.seatConfig.pairMode) {
              const pairBlockA = Math.floor(posA.c / 2);
              const pairBlockB = Math.floor(posB.c / 2);
              if (pairBlockA === pairBlockB) {
                return false; // 나란히 앉음 위반
              }
            } else {
              return false; // 일반 옆자리 위반
            }
          }
        }
      }
      return true;
    };

    // 최대 300회 시도하여 제약조건 만족하는 최적 배치 도출
    let bestGrid = null;
    let found = false;
    const maxAttempts = 300;

    const frontRowSet = this.constraints.frontRowStudents;
    const frontStudents = studentList.filter(s => frontRowSet.has(s.id));
    const normalStudents = studentList.filter(s => !frontRowSet.has(s.id));

    // 앞자리 행 한도 (보통 1행 또는 1~2행)
    const maxFrontRows = Math.min(2, this.seatConfig.rows);
    const frontSeatCapacity = maxFrontRows * this.seatConfig.cols;

    if (frontStudents.length > frontSeatCapacity) {
      return {
        success: false,
        message: `앞자리 지정 학생 수(${frontStudents.length}명)가 앞 1~2열 총 좌석(${frontSeatCapacity}석)보다 많습니다.`
      };
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 2차원 그리드 초기화 (rows x cols)
      const grid = Array.from({ length: this.seatConfig.rows }, () =>
        Array.from({ length: this.seatConfig.cols }, () => null)
      );

      // 사용 가능한 앞자리 슬롯 목록
      const frontSlots = [];
      for (let r = 0; r < maxFrontRows; r++) {
        for (let c = 0; c < this.seatConfig.cols; c++) {
          frontSlots.push({ r, c });
        }
      }
      const shuffledFrontSlots = shuffle(frontSlots);

      // 앞자리 학생들을 앞자리 슬롯에 배치
      const shuffledFrontStudents = shuffle(frontStudents);
      shuffledFrontStudents.forEach((student, i) => {
        const slot = shuffledFrontSlots[i];
        grid[slot.r][slot.c] = student;
      });

      // 남은 전체 슬롯 수집 (앞자리 남은 슬롯 + 뒷자리 슬롯)
      const remainingSlots = [];
      for (let r = 0; r < this.seatConfig.rows; r++) {
        for (let c = 0; c < this.seatConfig.cols; c++) {
          if (grid[r][c] === null) {
            remainingSlots.push({ r, c });
          }
        }
      }
      const shuffledRemainingSlots = shuffle(remainingSlots);

      // 일반 학생들을 남은 슬롯에 배치
      const shuffledNormalStudents = shuffle(normalStudents);
      shuffledNormalStudents.forEach((student, i) => {
        const slot = shuffledRemainingSlots[i];
        grid[slot.r][slot.c] = student;
      });

      // 제약조건(분리 학생 옆자리 방지) 검사
      if (checkConstraints(grid)) {
        bestGrid = grid;
        found = true;
        break;
      } else if (!bestGrid) {
        bestGrid = grid; // 최악의 경우 fallback
      }
    }

    // 최종 1차원 좌석 배열로 변환
    const layout = [];
    let seatIndex = 0;
    for (let r = 0; r < this.seatConfig.rows; r++) {
      for (let c = 0; c < this.seatConfig.cols; c++) {
        layout.push({
          index: seatIndex++,
          row: r,
          col: c,
          student: bestGrid ? bestGrid[r][c] : null
        });
      }
    }

    this.seatLayout = layout;

    return {
      success: true,
      foundConstraintMatch: found,
      layout: this.seatLayout,
      message: found 
        ? '모든 조건이 만족되는 자리가 성공적으로 배치되었습니다!' 
        : '일부 조건 충족이 어려워 최적의 조합으로 배치되었습니다.'
    };
  }

  // 두 좌석의 학생을 직접 맞바꾸기 (선생님 수동 조정 기능)
  swapSeats(seatIndexA, seatIndexB) {
    if (
      seatIndexA >= 0 && seatIndexA < this.seatLayout.length &&
      seatIndexB >= 0 && seatIndexB < this.seatLayout.length
    ) {
      const temp = this.seatLayout[seatIndexA].student;
      this.seatLayout[seatIndexA].student = this.seatLayout[seatIndexB].student;
      this.seatLayout[seatIndexB].student = temp;
      return true;
    }
    return false;
  }

  // 4. 모둠 편성 알고리즘
  generateGroupAllocation() {
    const studentList = [...this.students];
    const groupCount = Math.max(2, Math.min(8, this.groupConfig.groupCount));

    if (studentList.length === 0) {
      return { success: false, message: '학생 명단이 비어 있습니다. 명단을 먼저 입력해주세요!' };
    }

    // 셔플 유틸리티
    const shuffle = (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const shuffled = shuffle(studentList);

    // 모둠 객체 초기화
    const groups = [];
    for (let i = 0; i < groupCount; i++) {
      const theme = this.groupConfig.themes[i % this.groupConfig.themes.length];
      groups.push({
        id: `group_${i + 1}`,
        groupNumber: i + 1,
        name: `${i + 1}모둠 (${theme.name})`,
        icon: theme.icon,
        color: theme.color,
        badgeColor: theme.badgeColor,
        leaderId: null,
        members: []
      });
    }

    // 라운드 로빈 방식으로 인원 균등 분배
    shuffled.forEach((student, index) => {
      const groupIdx = index % groupCount;
      groups[groupIdx].members.push(student);
    });

    // 모둠장(이끄미) 자동 지정
    if (this.groupConfig.assignLeader) {
      groups.forEach(group => {
        if (group.members.length > 0) {
          const leaderIdx = Math.floor(Math.random() * group.members.length);
          group.leaderId = group.members[leaderIdx].id;
        }
      });
    }

    this.groups = groups;

    return {
      success: true,
      groups: this.groups,
      message: `${groupCount}개 모둠으로 균등하게 편성되었습니다!`
    };
  }

  // 모둠장 수동 변경
  setGroupLeader(groupId, studentId) {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      group.leaderId = studentId;
      return true;
    }
    return false;
  }
}

// 전역 인스턴스 생성
window.classManager = new ClassSeatManager();
window.SoundFX = SoundFX;
