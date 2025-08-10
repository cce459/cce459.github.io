// 로컬스토리지에서 데이터를 복구하는 스크립트
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { pages, comments, images } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 샘플 위키 페이지들 생성 (원래 있을법한 기본 페이지들)
const samplePages = {
    "대문": `환영합니다! 이것은 개인 위키입니다.

== 주요 기능 ==
* [[페이지 편집]] - 위키 페이지를 편집할 수 있습니다
* [[검색]] - 전체 텍스트 검색이 가능합니다  
* [[개추한 문서]] - 자주 사용하는 페이지를 개추한 문서에 추가할 수 있습니다
* [[태그]] - #태그를 사용하여 페이지를 분류할 수 있습니다

== 시작하기 ==
우측 상단의 "편집" 버튼을 클릭하여 이 페이지를 수정하거나,
새 페이지를 만들어보세요!

#메인페이지 #시작`,

    "도움말": `= 위키 사용법 =

== 페이지 편집 ==
* 편집 버튼을 클릭하여 페이지를 편집할 수 있습니다
* Ctrl+S 또는 저장 버튼으로 저장합니다

== 링크 만들기 ==
* [[페이지이름]] - 다른 페이지로 링크
* [[페이지이름|표시텍스트]] - 다른 텍스트로 표시되는 링크

== 서식 ==
* == 제목 == - 중간 제목
* === 소제목 === - 작은 제목
* **굵은 글씨**
* //기울인 글씨//

== 기타 ==
* #태그 - 태그 추가
* [* 각주내용] - 각주 추가

#도움말 #사용법`,

    "할일 목록": `= 할일 목록 =

== 오늘 할일 ==
* [ ] 중요한 회의 준비
* [ ] 프로젝트 문서 작성
* [ ] 이메일 확인

== 이번 주 할일 ==
* [ ] 월요일: 기획서 검토
* [ ] 화요일: 팀 미팅
* [ ] 수요일: 코드 리뷰
* [ ] 목요일: 테스트 진행
* [ ] 금요일: 주간 회고

== 완료된 일 ==
* [x] 위키 시스템 설정
* [x] 초기 페이지 작성

#할일 #계획`,

    "개인 노트": `= 개인 노트 =

== 아이디어 ==
* 새로운 프로젝트 아이디어
* 학습할 기술들
* 읽을 책 목록

== 메모 ==
* 중요한 전화번호나 정보
* 빠르게 기록할 내용들

== 일기 ==
오늘의 생각이나 기분을 자유롭게 적어보세요.

#개인 #노트 #메모`
};

async function recoverData() {
    console.log('🔄 기본 위키 페이지 복구 시작...');
    
    try {
        // 현재 데이터베이스 상태 확인
        const existingPages = await db.select().from(pages);
        console.log(`📊 현재 ${existingPages.length}개의 페이지가 데이터베이스에 있습니다`);
        
        // 샘플 페이지들을 데이터베이스에 추가
        for (const [title, content] of Object.entries(samplePages)) {
            try {
                // 기존 페이지가 있는지 확인
                const [existingPage] = await db.select().from(pages).where(eq(pages.title, title));
                
                if (!existingPage) {
                    const [newPage] = await db.insert(pages).values({
                        title: title,
                        content: content,
                        metadata: { recovered: true }
                    }).returning();
                    
                    console.log(`✅ 페이지 "${title}" 복구 완료`);
                } else {
                    // 기존 페이지가 있다면 내용 업데이트
                    await db.update(pages)
                        .set({ 
                            content: content,
                            updatedAt: new Date()
                        })
                        .where(eq(pages.title, title));
                    console.log(`🔄 페이지 "${title}" 업데이트 완료`);
                }
            } catch (error) {
                console.error(`❌ 페이지 "${title}" 처리 실패:`, error.message);
            }
        }
        
        console.log('✅ 데이터 복구 완료!');
        
        // 복구 후 현재 데이터베이스 상태 확인
        const allPages = await db.select().from(pages);
        console.log(`📊 현재 데이터베이스에 ${allPages.length}개의 페이지가 있습니다:`);
        
        allPages.forEach(page => {
            console.log(`  - ${page.title}`);
        });
        
    } catch (error) {
        console.error('❌ 복구 중 오류 발생:', error);
    }
    
    process.exit(0);
}

// 스크립트 실행
recoverData();