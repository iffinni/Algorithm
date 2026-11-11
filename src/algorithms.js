// Bad Character 전처리: 패턴에서 각 문자의 가장 오른쪽 인덱스를 저장한다.
export function buildBadCharTable(pattern) {
  const table = Object.create(null)
  for (let i = 0; i < pattern.length; i += 1) {
    table[pattern[i]] = i
  }
  return table
}

// Good Suffix 전처리: strong-suffix / border-position 방식.
// 반환 배열의 인덱스 k는 패턴의 k번째 위치부터 오른쪽 끝까지가
// 일치한 접미사일 때 적용할 이동 거리다. shift[0]은 완전 일치 후 이동 거리다.
export function buildGoodSuffixTable(pattern) {
  const m = pattern.length
  const shift = Array(m + 1).fill(0)
  const borderPos = Array(m + 1).fill(0)

  let i = m
  let j = m + 1
  borderPos[i] = j

  while (i > 0) {
    while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
      if (shift[j] === 0) shift[j] = j - i
      j = borderPos[j]
    }
    i -= 1
    j -= 1
    borderPos[i] = j
  }

  j = borderPos[0]
  for (i = 0; i <= m; i += 1) {
    if (shift[i] === 0) shift[i] = j
    if (i === j) j = borderPos[j]
  }

  return shift.map((value) => Math.max(1, value))
}

function snapshot(base, extra = {}) {
  return { ...base, ...extra }
}

export function runNaive(text, pattern) {
  const n = text.length
  const m = pattern.length
  const steps = []
  const matches = []
  let comparisons = 0
  let shifts = 0
  let shift = 0

  const add = (type, data) => steps.push(snapshot({
    type, shift, j: null, textIndex: null, comparisons, shifts,
    message: '', ...data,
  }))

  while (shift <= n - m) {
    let j = 0
    while (j < m) {
      comparisons += 1
      const equal = text[shift + j] === pattern[j]
      add(equal ? 'match-char' : 'mismatch', {
        j, textIndex: shift + j,
        message: equal
          ? `Text[${shift + j}]와 Pattern[${j}]가 일치합니다. 왼쪽에서 오른쪽으로 다음 문자를 비교합니다.`
          : `Text[${shift + j}]와 Pattern[${j}]가 다릅니다. 패턴을 한 칸 이동합니다.`,
      })
      if (!equal) break
      j += 1
    }

    if (j === m) {
      matches.push(shift)
      add('found', {
        message: `패턴을 인덱스 ${shift}에서 찾았습니다.`,
        foundIndex: shift,
      })
    }

    if (shift < n - m) {
      shifts += 1
      const nextShift = shift + 1
      add('shift', {
        message: `단순 비교는 불일치 여부와 관계없이 시작 위치를 한 칸 이동합니다. (${shift} → ${nextShift})`,
        nextShift,
      })
    }
    shift += 1
  }

  add('done', {
    message: matches.length
      ? `탐색 완료: ${matches.length}개의 일치 위치를 찾았습니다.`
      : '탐색 완료: 일치하는 패턴이 없습니다.',
  })
  return { steps, matches, comparisons, shifts, badTable: null, goodTable: null }
}

export function runBoyerMoore(text, pattern) {
  const n = text.length
  const m = pattern.length
  const badTable = buildBadCharTable(pattern)
  const goodTable = buildGoodSuffixTable(pattern)
  const steps = []
  const matches = []
  let comparisons = 0
  let shifts = 0
  let shift = 0

  const add = (type, data) => steps.push(snapshot({
    type, shift, j: null, textIndex: null, comparisons, shifts,
    message: '', badShift: null, goodShift: null, ...data,
  }))

  while (shift <= n - m) {
    let j = m - 1

    while (j >= 0) {
      comparisons += 1
      const equal = pattern[j] === text[shift + j]
      add(equal ? 'match-char' : 'mismatch', {
        j, textIndex: shift + j,
        message: equal
          ? `오른쪽부터 비교: Text[${shift + j}]와 Pattern[${j}]가 일치합니다.`
          : `오른쪽부터 비교: Text[${shift + j}]와 Pattern[${j}]가 다릅니다.`,
      })
      if (!equal) break
      j -= 1
    }

    if (j < 0) {
      matches.push(shift)
      add('found', {
        message: `패턴을 인덱스 ${shift}에서 찾았습니다. 전체 일치 후 Good Suffix 이동값 ${goodTable[0]}을 적용합니다.`,
        foundIndex: shift,
        goodShift: goodTable[0],
      })
      if (shift + goodTable[0] <= n - m) {
        const nextShift = shift + goodTable[0]
        shifts += 1
        add('shift', {
          message: `전체 패턴 일치 후 다음 중복 매칭 가능 위치로 ${goodTable[0]}칸 이동합니다. (${shift} → ${nextShift})`,
          nextShift,
          goodShift: goodTable[0],
        })
        shift = nextShift
      } else {
        shift += goodTable[0]
      }
    } else {
      const badChar = text[shift + j]
      const lastIndex = Object.prototype.hasOwnProperty.call(badTable, badChar)
        ? badTable[badChar]
        : -1
      const badShift = Math.max(1, j - lastIndex)
      const goodShift = goodTable[j + 1]
      const distance = Math.max(badShift, goodShift)
      add('decision', {
        j,
        textIndex: shift + j,
        badChar,
        lastIndex,
        badShift,
        goodShift,
        distance,
        message: `불일치 발생. Bad Character 이동 ${badShift}칸, Good Suffix 이동 ${goodShift}칸 중 큰 값인 ${distance}칸을 선택합니다.`,
      })

      const nextShift = shift + distance
      if (nextShift <= n - m) {
        shifts += 1
        add('shift', {
          message: `두 규칙 중 더 큰 이동 거리인 ${distance}칸만큼 이동합니다. (${shift} → ${nextShift})`,
          nextShift,
          badShift,
          goodShift,
          distance,
        })
      }
      shift = nextShift
    }
  }

  add('done', {
    message: matches.length
      ? `탐색 완료: ${matches.length}개의 일치 위치를 찾았습니다.`
      : '탐색 완료: 일치하는 패턴이 없습니다.',
  })
  return { steps, matches, comparisons, shifts, badTable, goodTable }
}
