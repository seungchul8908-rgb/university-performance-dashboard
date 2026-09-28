from pathlib import Path
import zipfile
root=Path(__file__).parent
guide='''2025 대학 성과관리 대시보드 소스

1. 다운로드한 ZIP의 압축을 풀어주세요.
2. dist 폴더의 index.html을 Chrome 또는 Edge로 열면 실행됩니다.
3. 엑셀 업로드, 부서 필터, 상한 비교, 엑셀 다운로드를 사용할 수 있습니다.

HTML, CSS, JavaScript와 기본 2025년 성과지표 데이터 및 엑셀 처리 라이브러리를 포함합니다.
설치와 API 키 없이 사용할 수 있습니다. 업로드 자료는 브라우저에서만 분석됩니다.
소스 다운로드 버튼은 온라인 배포용이며, 이 ZIP에는 ZIP 자체를 중복 포함하지 않았습니다.
다시 소스를 묶을 때는 dist 안의 HTML/CSS/JS와 이 안내 파일을 압축해주세요.

온라인 대시보드: https://university-performance-2025.catttta.chatgpt.site
'''
with zipfile.ZipFile(root/'dist/dashboard-source.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted((root/'dist').iterdir()):
        if p.is_file() and p.suffix in {'.html','.css','.js'}:
            z.write(p,'dist/'+p.name)
    z.writestr('사용방법.txt',guide)
    z.write(root/'README.md','README.md')
with zipfile.ZipFile(root/'dist/dashboard-source.zip') as z:
    assert z.testzip() is None
    assert 'dist/index.html' in z.namelist() and 'dist/default-data.js' in z.namelist()
    print('Validated source ZIP:',len(z.namelist()),'files')
