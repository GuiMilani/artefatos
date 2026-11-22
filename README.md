# artefatos

Portfólio artístico de Guilherme Milani, publicado em https://guimilani.github.io/artefatos/.

Cada **artefato** é um ciclo de produção fechado. A home é um catálogo-terminal: a lista rola,
o item que passa pela linha de leitura fica ativo e a capa dele se redesenha em ASCII, bit a bit,
num canvas por baixo da lista.

## Rodar no computador

```sh
npm install
npm run dev      # http://localhost:4321/artefatos/
npm run build    # gera o site em dist/
```

## Adicionar um artefato

1. Crie uma pasta em `src/content/artefatos/<slug>/` (o slug vira a URL: `/artefatos/a/<slug>/`).
2. Coloque a capa (`capa.jpg`) e as mídias em subpastas (`fotos/`, `audio/`, `video/`, `3d/`).
3. Crie um `index.md` com os metadados:

```yaml
---
numero: "0006"            # número de catálogo; a lista ordena do maior pro menor
titulo: "nome do ciclo"
ano: "2026"               # o que aparece na linha da lista
periodo: "2025–2026"
local: "Sorocaba / SP"
midias: ["foto", "scan", "som"]
acento: "#ff2a2a"         # a única cor do artefato
capa: ./capa.jpg
seed: 6                   # muda a ordem da revelação do ASCII
charset: padrao           # padrao | blocos | kana
brilho: max               # max (fiel ao year0001, apaga cor) | luma
rascunho: false           # true esconde o artefato do site
blocos:
  - { tipo: foto, src: ./fotos/01.jpg, legenda: "35mm, hp5" }
  - { tipo: scan, src: ./fotos/02.png }
  - { tipo: texto, conteudo: "duas linhas, no máximo" }
  - { tipo: audio, src: ./audio/faixa.mp3, titulo: "faixa 01", loop: false }
  - { tipo: video, src: ./video/loop.mp4, poster: ./video/loop.jpg }
  - { tipo: modelo3d, src: ./3d/objeto.glb, poster: ./3d/objeto.jpg }
---
```

### Formatos

- Fotos e scans: JPG ou PNG em alta. O build gera AVIF/WebP em 480, 800 e 1200 px.
- Áudio: MP3 192–256 kbps. Fragmentos curtos em loop: WAV.
- Vídeo (TouchDesigner): MP4 H.264, 720p, 3–8 MB, sem som pra tocar sozinho.
- 3D: `.glb` com compressão Draco ou meshopt, até ~5 MB.
- Nenhum arquivo pode passar de 100 MB (limite do GitHub).

## Estrutura

- `src/content/artefatos/`: o conteúdo (uma pasta por artefato).
- `src/content.config.ts`: o formato dos metadados.
- `src/lib/ascii.ts`: converte a capa em caracteres no build.
- `src/lib/ascii-canvas.ts`: desenha e anima o ASCII no navegador.
- `src/pages/index.astro`: a home.
- `src/pages/a/[id].astro`: a página de cada artefato.

## Publicação

Todo push na `main` publica o site pelo GitHub Actions
(Settings → Pages → Source: GitHub Actions).

Os artefatos `teste-*` são de exemplo. Apague as pastas quando entrarem os reais.
