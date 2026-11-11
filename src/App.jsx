import { useEffect, useMemo, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronDown, BookOpen, Zap, GitCompareArrows, CheckCircle2, Info } from 'lucide-react'
import { runNaive, runBoyerMoore } from './algorithms'

const EXAMPLES = [
  { name: '기본 탐색', text: 'ABAAABABAA', pattern: 'ABA', note: '일치와 불일치가 섞인 기본 예제' },
  { name: '패턴 없음', text: 'ABCDEFGH', pattern: 'XYZ', note: '패턴을 찾지 못하는 경우' },
  { name: '반복 문자', text: 'AAAAAAAAAA', pattern: 'AAA', note: '반복 문자가 많은 경우' },
  { name: '중복 매칭', text: 'ABCABCABCA', pattern: 'ABCA', note: '겹치는 위치에서 여러 번 일치하는 경우' },
  { name: '긴 접미사', text: 'ABCDABCEFG', pattern: 'ABCE', note: 'Good Suffix 이동을 관찰하기 위한 예제' },
]

function CharRow({ text, pattern, step, kind }) {
  const activeShift = Math.max(0, Math.min(step?.shift ?? 0, text.length))
  const activeTextIndex = step?.textIndex
  const activePatternIndex = step?.j
  const isDone = step?.type === 'done'
  const patternMatched = step?.type === 'found'
  const mismatch = step?.type === 'mismatch' || step?.type === 'decision'
  const charWidth = 38

  return (
    <div className="visual-scroll">
      <div className="char-label">TEXT</div>
      <div className="char-row">
        {text.split('').map((char, index) => {
          let state = ''
          if (index === activeTextIndex && mismatch) state = 'bad'
          else if (index === activeTextIndex && step?.type === 'match-char') state = 'good'
          else if (patternMatched && index >= activeShift && index < activeShift + pattern.length) state = 'good'
          return <div key={index} className={`char-cell ${state} ${index === activeTextIndex ? 'current' : ''}`}>
            <span>{char}</span><small>{index}</small>
          </div>
        })}
      </div>
      <div className="char-label pattern-label">PATTERN</div>
      <div className="pattern-track" style={{ minWidth: `${text.length * charWidth}px` }}>
        <div className="pattern-row" style={{ marginLeft: `${activeShift * charWidth}px` }}>
          {pattern.split('').map((char, index) => {
            let state = ''
            if (index === activePatternIndex && mismatch) state = 'bad'
            else if (index === activePatternIndex && step?.type === 'match-char') state = 'good'
            else if (patternMatched) state = 'good'
            return <div key={index} className={`char-cell pattern-cell ${state}`}>
              <span>{char}</span><small>{index}</small>
            </div>
          })}
        </div>
      </div>
      <div className="alignment-note">
        <span className="alignment-marker" style={{ left: `${activeShift * charWidth}px` }} />
        <span>현재 시작 위치: {step?.shift ?? 0}</span>
      </div>
    </div>
  )
}

function TableView({ title, data, type }) {
  if (!data) return null
  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]))
  return (
    <div className="table-card">
      <div className="table-title">{title}</div>
      {type === 'good'
        ? <div className="table-grid">
            {data.map((value, index) => <div className="table-item" key={index}><small>{index}</small><b>{value}</b></div>)}
          </div>
        : <div className="table-grid">
            {entries.map(([char, value]) => <div className="table-item" key={char}><small>{char}</small><b>{value}</b></div>)}
            <div className="table-item"><small>없는 문자</small><b>-1</b></div>
          </div>}
    </div>
  )
}

function AlgorithmPanel({ title, subtitle, tone, result, index, onStep }) {
  const step = result.steps[Math.min(index, result.steps.length - 1)]
  const progress = result.steps.length <= 1 ? 100 : (Math.min(index, result.steps.length - 1) / (result.steps.length - 1)) * 100
  const statusText = step.type === 'done' ? '탐색 완료' : step.type === 'found' ? '패턴 발견' : step.type === 'decision' ? '이동 거리 계산' : step.type === 'shift' ? '패턴 이동' : step.type === 'mismatch' ? '불일치' : '문자 비교'

  return (
    <section className={`algorithm-panel ${tone}`}>
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{subtitle}</div>
          <h2>{title}</h2>
        </div>
        <span className={`status-pill ${step.type === 'done' ? 'finished' : ''}`}>{statusText}</span>
      </div>
      <CharRow text={result.text} pattern={result.pattern} step={step} />
      <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      <div className="step-caption">
        <span>단계 {Math.min(index + 1, result.steps.length)} / {result.steps.length}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="explanation">
        <Info size={16} />
        <span>{step.message}</span>
      </div>

      {title === 'Boyer-Moore' && (
        <div className="tables-area">
          <TableView title="Bad Character Table" data={result.badTable} type="bad" />
          <TableView title="Good Suffix Table" data={result.goodTable} type="good" />
        </div>
      )}

      {step.type === 'decision' && title === 'Boyer-Moore' && (
        <div className="move-calculation">
          <div><span>Bad Character</span><b>{step.badShift}칸</b></div>
          <div><span>Good Suffix</span><b>{step.goodShift}칸</b></div>
          <div className="selected"><span>선택된 이동</span><b>{step.distance}칸</b></div>
        </div>
      )}

      <div className="metrics">
        <div><small>문자 비교 횟수</small><b>{step.comparisons}</b></div>
        <div><small>패턴 이동 횟수</small><b>{step.shifts}</b></div>
        <div><small>발견 위치</small><b>{result.matches.length ? result.matches.join(', ') : '—'}</b></div>
      </div>
    </section>
  )
}

function App() {
  const [exampleIndex, setExampleIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(900)
  const example = EXAMPLES[exampleIndex]

  const naive = useMemo(() => ({ ...runNaive(example.text, example.pattern), text: example.text, pattern: example.pattern }), [example])
  const bm = useMemo(() => ({ ...runBoyerMoore(example.text, example.pattern), text: example.text, pattern: example.pattern }), [example])
  const maxSteps = Math.max(naive.steps.length, bm.steps.length)
  const naiveIndex = Math.min(stepIndex, naive.steps.length - 1)
  const bmIndex = Math.min(stepIndex, bm.steps.length - 1)
  const naiveDone = naive.steps[naiveIndex]?.type === 'done'
  const bmDone = bm.steps[bmIndex]?.type === 'done'
  const allDone = naiveDone && bmDone

  useEffect(() => {
    setStepIndex(0)
    setPlaying(false)
  }, [exampleIndex])

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= maxSteps - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, speed)
    return () => window.clearInterval(timer)
  }, [playing, speed, maxSteps])

  const reset = () => { setPlaying(false); setStepIndex(0) }
  const next = () => { setPlaying(false); setStepIndex((v) => Math.min(v + 1, maxSteps - 1)) }
  const previous = () => { setPlaying(false); setStepIndex((v) => Math.max(v - 1, 0)) }

  const naiveCurrent = naive.steps[naiveIndex]
  const bmCurrent = bm.steps[bmIndex]

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><GitCompareArrows size={19} /></span> String Matching <b>Lab</b></a>
        <span className="top-tag">ALGORITHM VISUALIZER</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow">문자열 탐색 알고리즘 내부동작 시각화 과제</div>
          <h1>단순 비교 vs Boyer-Moore 알고리즘<br /><span>알고리즘의 차이를 직접 확인하세요.</span></h1>
          <p>단순 비교와 Boyer-Moore가 패턴을 찾는 과정을 한 단계씩 비교하고, 문자 비교 횟수와 이동 원리를 확인할 수 있습니다.</p>
        </div>
        <div className="hero-icon"><GitCompareArrows size={42} strokeWidth={1.5} /></div>
      </section>

      <section className="control-card">
        <div className="section-heading">
          <div><span className="section-number">01</span><h2>문자열 탐색 예제 선택</h2></div>
        </div>
        <div className="example-list">
          {EXAMPLES.map((item, index) => (
            <button key={item.name} onClick={() => setExampleIndex(index)} className={`example-button ${exampleIndex === index ? 'active' : ''}`}>
              <span className="example-name">{item.name}</span>
              <span className="example-text">{item.text}</span>
            </button>
          ))}
        </div>
        <div className="selected-inputs">
          <div><small>TEXT</small><strong>{example.text}</strong><span>{example.text.length} / 10자</span></div>
          <div className="input-divider">찾을 패턴 <b>→</b></div>
          <div><small>PATTERN</small><strong>{example.pattern}</strong><span>{example.pattern.length}자</span></div>
          <p>{example.note}</p>
        </div>
      </section>

      <section className="control-card playback-card">
        <div className="section-heading">
          <div><span className="section-number">02</span><h2>단계별 탐색</h2></div>
          <span className="helper-text">두 알고리즘의 진행 상황을 나란히 확인하세요.</span>
        </div>
        <div className="playback-controls">
          <button className="icon-button" onClick={reset} title="처음으로"><RotateCcw size={17} /></button>
          <button className="icon-button" onClick={previous} disabled={stepIndex === 0} title="이전 단계"><SkipBack size={17} /></button>
          <button className="primary-button" onClick={() => {
            if (allDone) setStepIndex(0)
            setPlaying((v) => !v)
          }}>
            {playing ? <Pause size={17} /> : <Play size={17} />}
            {playing ? '일시정지' : allDone ? '처음부터 재생' : '자동 재생'}
          </button>
          <button className="icon-button" onClick={next} disabled={stepIndex >= maxSteps - 1} title="다음 단계"><SkipForward size={17} /></button>
          <label className="speed-control">재생 속도
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={1400}>느리게</option>
              <option value={900}>보통</option>
              <option value={450}>빠르게</option>
            </select>
          </label>
          <span className="global-step">공통 진행 단계 <b>{stepIndex + 1} / {maxSteps}</b></span>
        </div>
        <div className="legend">
          <span><i className="legend-dot good" /> 일치</span>
          <span><i className="legend-dot bad" /> 불일치</span>
          <span><i className="legend-dot current" /> 현재 비교 위치</span>
        </div>
      </section>

      <section className="comparison-grid">
        <AlgorithmPanel title="단순 비교" subtitle="NAIVE STRING MATCHING" tone="naive" result={naive} index={naiveIndex} />
        <AlgorithmPanel title="Boyer-Moore" subtitle="BAD CHARACTER + GOOD SUFFIX" tone="bm" result={bm} index={bmIndex} />
      </section>

      <section className="control-card result-card">
        <div className="section-heading">
          <div><span className="section-number">03</span><h2>실행 결과 비교</h2></div>
          <span className="helper-text">실제 알고리즘 실행에서 측정한 값입니다.</span>
        </div>
        <div className="result-summary">
          <div className="result-metric naive-result"><span>단순 비교</span><strong>{naive.comparisons}</strong><small>문자 비교 횟수</small></div>
          <div className="versus">VS</div>
          <div className="result-metric bm-result"><span>Boyer-Moore</span><strong>{bm.comparisons}</strong><small>문자 비교 횟수</small></div>
        </div>
        <div className="result-details">
          <div><span>단순 비교 일치 위치</span><b>{naive.matches.length ? naive.matches.join(', ') : '일치 없음'}</b></div>
          <div><span>Boyer-Moore 일치 위치</span><b>{bm.matches.length ? bm.matches.join(', ') : '일치 없음'}</b></div>
          <div><span>비교 횟수 차이</span><b>{Math.abs(naive.comparisons - bm.comparisons)}회</b></div>
          <div><span>탐색 결과 일치 여부</span><b className="same-result"><CheckCircle2 size={16} /> {JSON.stringify(naive.matches) === JSON.stringify(bm.matches) ? '두 알고리즘 결과 동일' : '결과 확인 필요'}</b></div>
        </div>
        <p className="result-footnote">※ 비교 횟수는 실제 문자 대조 횟수만 계산합니다. 전처리 과정에서 수행하는 테이블 계산 연산은 포함하지 않습니다.</p>
      </section>

      <section className="pros-cons">
        <div className="section-heading">
          <div><span className="section-number">04</span><h2>알고리즘 장단점</h2></div>
        </div>
        <div className="pros-grid">
          <article className="pros-card">
            <div className="pros-title"><div className="mini-icon blue"><BookOpen size={19} /></div><div><h3>단순 비교</h3><span>Naive String Matching</span></div></div>
            <div className="pros-line"><b className="plus">장점</b><p>구현이 간단하고 별도의 전처리 테이블이 필요하지 않습니다.</p></div>
            <div className="pros-line"><b className="minus">단점</b><p>불일치가 발생해도 한 칸씩 이동하므로 불필요한 비교가 반복될 수 있습니다.</p></div>
            <div className="complexity"><span>최악 시간 복잡도</span><b>O(NM)</b></div>
          </article>
          <article className="pros-card">
            <div className="pros-title"><div className="mini-icon purple"><Zap size={19} /></div><div><h3>Boyer-Moore</h3><span>Bad Character + Good Suffix</span></div></div>
            <div className="pros-line"><b className="plus">장점</b><p>불일치 정보를 활용해 패턴을 여러 칸 이동하므로 실제 탐색에서 비교 횟수를 줄일 수 있습니다.</p></div>
            <div className="pros-line"><b className="minus">단점</b><p>두 테이블의 전처리가 필요하고 구현이 상대적으로 복잡합니다.</p></div>
            <div className="complexity"><span>평균적으로 빠른 탐색 / 최악은 구현·변형에 따라 분석</span><b>전처리 필요</b></div>
          </article>
        </div>
      </section>

      <footer>
        <div className="footer-brand">String Matching <b>Lab</b></div>
        <p>Naive String Matching & Boyer-Moore Algorithm Visualizer</p>
        <span>학습 목적으로 제작된 알고리즘 시각화 도구</span>
      </footer>
    </main>
  )
}

export default App
