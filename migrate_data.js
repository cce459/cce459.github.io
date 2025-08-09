// 기존 localStorage/JSON 데이터를 PostgreSQL로 마이그레이션하는 스크립트
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { pages, comments, images } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateData() {
    console.log('🔄 데이터 마이그레이션 시작...');
    
    try {
        // 1. 기존 JSON 파일에서 페이지 데이터 읽기
        const pagesJsonPath = path.join(__dirname, 'data', 'pages.json');
        let existingPages = {};
        
        if (fs.existsSync(pagesJsonPath)) {
            const jsonData = fs.readFileSync(pagesJsonPath, 'utf-8');
            existingPages = JSON.parse(jsonData || '{}');
            console.log(`📄 ${Object.keys(existingPages).length}개의 기존 페이지 발견`);
        }
        
        // 2. 각 페이지를 데이터베이스에 삽입
        for (const [title, content] of Object.entries(existingPages)) {
            try {
                // 기존 페이지가 있는지 확인
                const [existingPage] = await db.select().from(pages).where(eq(pages.title, title));
                
                if (!existingPage) {
                    const [newPage] = await db.insert(pages).values({
                        title: title,
                        content: content,
                        metadata: { migrated: true }
                    }).returning();
                    
                    console.log(`✅ 페이지 "${title}" 마이그레이션 완료`);
                } else {
                    console.log(`⚠️ 페이지 "${title}"는 이미 존재합니다`);
                }
            } catch (error) {
                console.error(`❌ 페이지 "${title}" 마이그레이션 실패:`, error.message);
            }
        }
        
        console.log('✅ 데이터 마이그레이션 완료!');
        
        // 마이그레이션 후 현재 데이터베이스 상태 확인
        const allPages = await db.select().from(pages);
        console.log(`📊 현재 데이터베이스에 ${allPages.length}개의 페이지가 있습니다:`);
        
        allPages.forEach(page => {
            console.log(`  - ${page.title} (${new Date(page.createdAt).toLocaleString()})`);
        });
        
    } catch (error) {
        console.error('❌ 마이그레이션 중 오류 발생:', error);
    }
    
    process.exit(0);
}

// 스크립트 실행
migrateData();