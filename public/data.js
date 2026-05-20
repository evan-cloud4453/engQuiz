// 시간 배분: 총 60분 (3600초)
// Part 1(15): 8분, Part 2(15): 7분, Part 3(10): 5분, Part 4(30): 15분, Part 5(15): 9분, Part 6(15): 16분

const partsInfo = [
    {
        title: "Part 1. 단순 의미 확인",
        timeLimit: 480,
        instruction: "제시된 영단어의 정확한 뜻을 고르시오.",
        example: {
            q: "inadvertently",
            options: ["(A) 꼼꼼하게, 세심하게", "(B) 점차로, 서서히", "(C) 무심코, 부주의하게", "(D) 주목할 만하게"],
            answer: "(C) 무심코, 부주의하게"
        },
        questions: [
            { q: "inadvertently", options: ["(A) 꼼꼼하게, 세심하게", "(B) 점차로, 서서히", "(C) 무심코, 부주의하게", "(D) 주목할 만하게"], answer: "(C) 무심코, 부주의하게" },
            { q: "meticulously", options: ["(A) 완전히, 전부 합하여", "(B) 꼼꼼하게, 세심하게", "(C) 합작으로", "(D) 압도적으로"], answer: "(B) 꼼꼼하게, 세심하게" },
            // ... (나머지 Part 1 문제들 13개)
        ]
    },
    {
        title: "Part 2. 동의어 / 반의어",
        timeLimit: 420,
        instruction: "다음 중 짝지어진 단어의 관계(동의어/반의어)가 <b>나머지 셋과 다른 하나</b>를 고르시오.",
        example: {
            q: "관계가 다른 하나는?",
            options: ["(A) abandon - give up", "(B) reduce - decrease", "(C) expand - contract", "(D) distinguish - differentiate"],
            answer: "(C) expand - contract"
        },
        questions: [
            { q: "관계가 다른 하나는?", options: ["(A) abandon - give up", "(B) reduce - decrease", "(C) expand - contract", "(D) distinguish - differentiate"], answer: "(C) expand - contract" },
            // ... (나머지 Part 2 문제들)
        ]
    },
    {
        title: "Part 3. 품사 및 의미 확인",
        timeLimit: 300,
        instruction: "제시된 단어의 정확한 품사와 뜻을 고르시오. (명사: n. / 동사: v. / 형용사: adj. / 부사: ad.)",
        example: {
            q: "consistently",
            options: ["(A) adj. 지속적인", "(B) n. 일관성", "(C) v. 구성되다", "(D) ad. 지속적으로, 일관되게"],
            answer: "(D) ad. 지속적으로, 일관되게"
        },
        questions: [
            { q: "consistently", options: ["(A) adj. 지속적인", "(B) n. 일관성", "(C) v. 구성되다", "(D) ad. 지속적으로, 일관되게"], answer: "(D) ad. 지속적으로, 일관되게" },
            // ... (나머지 Part 3 문제들, adv.를 ad.로 수정해서 넣으세요)
        ]
    },
    {
        title: "Part 4. 실전 문맥 파악",
        timeLimit: 900,
        instruction: "다음 문장의 빈칸에 들어갈 가장 알맞은 어휘를 고르시오.",
        example: {
            q: "Property taxes in Granville, a relatively new, ----- area, are higher than in Powerton.",
            options: ["(A) considerably", "(B) spaciously", "(C) diligently", "(D) expertly"],
            answer: "(B) spaciously"
        },
        questions: [
            { q: "Property taxes in Granville, a relatively new, ----- area, are higher than in Powerton.", options: ["(A) considerably", "(B) spaciously", "(C) diligently", "(D) expertly"], answer: "(B) spaciously" },
            // ... (나머지 Part 4 문제들)
        ]
    },
    {
        title: "Part 5. 철자 배열 (Scramble)",
        timeLimit: 540,
        instruction: "제시된 한글 뜻과 무작위로 섞인 알파벳 힌트를 보고, 올바른 영단어 스펠링을 입력창에 타이핑하시오.",
        example: {
            q: "할당하다, 배정하다 <br><span style='color:#a38d73;'>( l, o, e, c, a, l, a, t )</span>",
            answer: "allocate" // options 속성을 제거하여 자동으로 주관식 입력창이 생성됩니다.
        },
        questions: [
            // q에는 한글 뜻만 적어주세요. 시스템이 answer를 기반으로 알파벳을 무작위로 섞어서 자동으로 힌트를 괄호에 붙여줍니다!
            { q: "할당하다, 배정하다", answer: "allocate" },
            { q: "호환이 되는, 화합할 수 있는", answer: "compatible" },
            { q: "철저한, 빈틈없는", answer: "thorough" },
            { q: "따르다, 지키다", answer: "comply" }
            // ... (나머지 Part 5 문제들)
        ]
    },
    {
        title: "Part 6. 철자 쓰기 (주관식)",
        timeLimit: 960,
        instruction: "해석과 첫 글자 힌트를 보고, 문맥에 맞는 단어를 <b>완전한 스펠링</b>으로 타이핑하시오.",
        example: {
            q: "After ten years in the marketing department, Ms. Quinn was finally p----- to director.\n(해석: 마케팅 부서에서 10년을 보낸 후, 퀸 씨는 마침내 이사로 승진되었습니다.)",
            answer: "promoted"
        },
        questions: [
            { q: "After ten years in the marketing department, Ms. Quinn was finally p----- to director.\n(해석: 마케팅 부서에서 10년을 보낸 후, 퀸 씨는 마침내 이사로 승진되었습니다.)", answer: "promoted" },
            // ... (나머지 Part 6 문제들)
        ]
    }
];
