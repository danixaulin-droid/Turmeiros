# Turmeiro Caixas PWA

Aplicativo PWA Offline-first para controle de colheita de laranja. Desenvolvido com Next.js, Dexie.js (IndexedDB) e Tailwind CSS.

## Funcionalidades
- **Offline Total**: Funciona sem internet.
- **Banco de Dados Local**: Usa Dexie.js para armazenar dados no navegador.
- **Marcação Rápida**: Interface otimizada para toques rápidos no sol.
- **Instalável**: Funciona como aplicativo nativo (Android/iOS).
- **Exportação**: Gera arquivos CSV para Excel.
- **Backup**: Exporta/Importa JSON completo do banco.

## Ícones do PWA (Importante)
Para que o app seja instalado corretamente, você deve adicionar os seguintes arquivos na pasta `public/icons/`:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)
- `icon-512-maskable.png` (512x512 pixels, com margem de segurança)

## Como Rodar Localmente

1. Instale as dependências:
```bash
npm install
```

2. Rode o servidor de desenvolvimento:
```bash
npm run dev
```

3. Acesse `http://localhost:3000`.

## Como Buildar (Para Netlify / Estático)

```bash
npm run build
```
O comando gera a pasta `out`.

## 📱 COMO INSTALAR NO CELULAR (Android)

1. **Acesse o link** do site pelo Google Chrome.
2. Aguarde carregar. Se aparecer uma barra na parte inferior ou um botão **"INSTALAR APLICATIVO"** no topo da tela inicial, toque nele.
3. Se não aparecer, toque nos **três pontinhos (menu)** do Chrome -> **"Instalar aplicativo"** ou "Adicionar à tela inicial".
4. O ícone aparecerá na sua lista de apps.

## 🚀 PROCESSO DE TESTE OFFLINE (OBRIGATÓRIO)

Para garantir que o app funcionará no campo:

1. **Instale** o app seguindo os passos acima.
2. **Abra o app instalado** (não o navegador).
3. **Modo Avião**: Desligue Wi-Fi e Dados Móveis.
4. **Teste**:
   - Feche o app completamente.
   - Abra novamente.
   - Crie um dia, marque caixas.
5. **Validação**: Se o aviso vermelho "VOCÊ ESTÁ OFFLINE" aparecer no topo e o app funcionar normalmente, o PWA está pronto.

## Backup de Segurança

Sempre oriente o turmeiro a usar o botão **"Baixar Dados (Backup)"** no menu Backup ao final de cada semana, quando tiver internet.