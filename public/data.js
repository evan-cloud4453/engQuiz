// 시간 배분: 총 60분 (3600초)
// Part 1(15): 8분(480s), Part 2(15): 7분(420s), Part 3(10): 5분(300s)
// Part 4(30): 15분(900s), Part 5(15): 9분(540s), Part 6(15): 16분(960s) - 주관식이므로 시간 넉넉히 부여하여 합 60분 맞춤.

const partsInfo = [
    {
        title: "Part 1. 단순 의미 확인",
        timeLimit: 480, 
        instruction: "다음 영단어의 정확한 뜻을 고르시오. <br><br>[예시] <br>Q. inadvertently<br>(A) 꼼꼼하게 (B) 서서히 (C) 무심코 (정답: C)",
        questions: [
            { q: "inadvertently", options: ["(A) 꼼꼼하게, 세심하게", "(B) 점차로, 서서히", "(C) 무심코, 부주의하게", "(D) 주목할 만하게"], answer: "(C) 무심코, 부주의하게" },
            // TODO: 이전에 만들어드린 Part 1의 나머지 14문제를 여기에 복사해 넣으세요.
        ]
    },
    {
        title: "Part 2. 동의어 / 반의어",
        timeLimit: 420,
        instruction: "다음 중 짝지어진 단어의 관계(동의어/반의어)가 <b>나머지 셋과 다른 하나</b>를 고르시오.",
        questions: [
            { q: "관계가 다른 하나는?", options: ["(A) abandon - give up", "(B) reduce - decrease", "(C) expand - contract", "(D) distinguish - differentiate"], answer: "(C) expand - contract" },
            // TODO: Part 2 나머지 문제 삽입
        ]
    },
    {
        title: "Part 3. 품사 및 의미 확인",
        timeLimit: 300,
        instruction: "제시된 단어의 정확한 품사와 뜻을 고르시오.",
        questions: [
            { q: "consistently", options: ["(A) adj. 지속적인", "(B) n. 일관성", "(C) v. 구성되다", "(D) adv. 지속적으로, 일관되게"], answer: "(D) adv. 지속적으로, 일관되게" },
            // TODO: Part 3 나머지 문제 삽입
        ]
    },
    {
        title: "Part 4. 실전 문맥 파악",
        timeLimit: 900,
        instruction: "문장의 빈칸에 들어갈 가장 알맞은 어휘를 고르시오.",
        questions: [
            { q: "Property taxes in Granville, a relatively new, ----- area, are higher than in Powerton.", options: ["(A) considerably", "(B) spaciously", "(C) diligently", "(D) expertly"], answer: "(B) spaciously" },
            // TODO: Part 4 나머지 문제 삽입
        ]
    },
    {
        title: "Part 5. 철자 배열 (Scramble)",
        timeLimit: 540,
        instruction: "한글 뜻과 섞인 알파벳을 보고 올바른 영단어를 선택하시오.",
        questions: [
            { q: "할당하다, 배정하다 ( a, l, l, o, c, a, t, e )", options: ["(A) colate", "(B) allocate", "(C) calloate", "(D) locateal"], answer: "(B) allocate" },
            // (참고: Scramble은 객관식으로 내거나, Part 6처럼 주관식으로 바꿀 수 있습니다. 현재 코드는 객관식 템플릿입니다)
        ]
    },
    {
        title: "Part 6. 철자 쓰기 (주관식)",
        timeLimit: 960,
        instruction: "문맥과 해석, 첫 글자 힌트를 보고 빈칸에 들어갈 정확한 영단어(철자)를 입력하시오.",
        questions: [
            { q: "After ten years in the marketing department, Ms. Quinn was finally p----- to director.\n(해석: 마케팅 부서에서 10년을 보낸 후, 퀸 씨는 마침내 이사로 승진되었습니다.)", answer: "promoted" },
            // TODO: Part 6 나머지 문제 삽입 (options 배열이 없으면 자동으로 주관식 입력창이 뜹니다.)
        ]
    }
];