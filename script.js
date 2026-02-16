<?php
/**
 * 💼 JOB HUNTER - FIXED LAYOUT
 * -----------------------------
 */

ini_set('display_errors', 0); error_reporting(E_ALL);
header('Content-Type: text/html; charset=utf-8'); 
date_default_timezone_set('America/Sao_Paulo');

try {
    $db = new PDO('sqlite:jobhunter_dados.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec("PRAGMA encoding = 'UTF-8';");
} catch(PDOException $e) { die("Erro no Banco de Dados: " . $e->getMessage()); }

// Tabelas
$db->exec("CREATE TABLE IF NOT EXISTS vagas (id INTEGER PRIMARY KEY, titulo TEXT, empresa TEXT, local TEXT, link TEXT, plataforma TEXT DEFAULT 'Outros', status TEXT DEFAULT '🎯 Na Mira', descricao TEXT, favorito INTEGER DEFAULT 0, data_add DATETIME, texto_data_postagem TEXT, data_limite DATE, json_raw TEXT)");
$db->exec("CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY, serp_api_key TEXT, deepseek_key TEXT, cidade_padrao TEXT, incluir_remoto INTEGER DEFAULT 0, ia_proibicoes TEXT)");
$db->exec("CREATE TABLE IF NOT EXISTS areas (id INTEGER PRIMARY KEY, nome TEXT)");
$db->exec("CREATE TABLE IF NOT EXISTS area_vagas (id INTEGER PRIMARY KEY, area_id INTEGER, vaga_id INTEGER, ordem INTEGER DEFAULT 0)");
$db->exec("CREATE TABLE IF NOT EXISTS curriculos (id INTEGER PRIMARY KEY, nome TEXT, tipo TEXT, dados BLOB, data_upload DATETIME)");
$db->exec("CREATE TABLE IF NOT EXISTS perfil (id INTEGER PRIMARY KEY, nome_completo TEXT, cargo_titulo TEXT, email TEXT, telefone TEXT, linkedin TEXT, github TEXT, localizacao TEXT, resumo_base TEXT, skills_hard TEXT, exp1_empresa TEXT, exp1_cargo TEXT, exp1_data TEXT, exp1_desc TEXT, exp2_empresa TEXT, exp2_cargo TEXT, exp2_data TEXT, exp2_desc TEXT)");

// POST Actions
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['add_manual'])) { 
        $db->prepare("INSERT INTO vagas (titulo, empresa, link, plataforma, status, descricao, data_add) VALUES (?, ?, ?, ?, ?, '🎯 Na Mira', ?, CURRENT_TIMESTAMP)")
           ->execute([$_POST['titulo'], $_POST['empresa'], $_POST['link'], $_POST['plataforma'], $_POST['descricao']]); 
        header("Location: index.php"); exit; 
    }
    if (isset($_POST['atualizar_vaga'])) { 
        $db->prepare("UPDATE vagas SET status = ?, plataforma = ?, data_limite = ? WHERE id = ?")
           ->execute([$_POST['status'], $_POST['plataforma'], $_POST['data_limite'], $_POST['id']]); 
        header("Location: index.php"); exit; 
    }
    if (isset($_POST['ex_vaga'])) { 
        $db->prepare("DELETE FROM vagas WHERE id = ?")->execute([$_POST['id']]); 
        header("Location: index.php"); exit; 
    }
    if (isset($_POST['salvar_config'])) {
        $db->exec("DELETE FROM config");
        $db->prepare("INSERT INTO config (id, serp_api_key, deepseek_key, cidade_padrao, incluir_remoto, ia_proibicoes) VALUES (1, ?, ?, ?, ?, ?)")
           ->execute([trim($_POST['serp_key']), trim($_POST['deepseek_key']), trim($_POST['cidade']), isset($_POST['remoto'])?1:0, trim($_POST['ia_proibicoes'])]);
        header("Location: index.php"); exit;
    }
    if (isset($_POST['toggle_favorito'])) {
        $db->prepare("UPDATE vagas SET favorito = CASE WHEN favorito = 1 THEN 0 ELSE 1 END WHERE id = ?")->execute([$_POST['id']]);
        header("Location: index.php"); exit;
    }
    if (isset($_POST['ol'])) { 
        foreach ($_POST['ol'] as $pos => $id) $db->prepare("UPDATE area_vagas SET ordem = ? WHERE id = ?")->execute([$pos, $id]); 
        exit; 
    }
}

// Busca e Filtros
$busca = $_GET['busca'] ?? '';
$where = "WHERE 1=1";
if($busca) $where .= " AND (titulo LIKE '%$busca%' OR empresa LIKE '%$busca%' OR plataforma LIKE '%$busca%')";

$vagas = $db->query("SELECT * FROM vagas $where ORDER BY data_add DESC LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
$stats = [ 
    'mira' => $db->query("SELECT COUNT(*) FROM vagas WHERE status = '🎯 Na Mira'")->fetchColumn(), 
    'disputa' => $db->query("SELECT COUNT(*) FROM vagas WHERE status = '🏹 Disputando'")->fetchColumn() 
];
$conf = $db->query("SELECT * FROM config WHERE id = 1")->fetch(PDO::FETCH_ASSOC) ?: [];
$areas = $db->query("SELECT * FROM areas")->fetchAll(PDO::FETCH_ASSOC);
$area_items = $db->query("SELECT av.id as item_id, v.*, av.area_id FROM area_vagas av JOIN vagas v ON av.vaga_id = v.id ORDER BY av.ordem ASC")->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JobHunter</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config={darkMode:'class'}</script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <nav class="nav-header">
        <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div class="flex items-center gap-2 text-blue-600 text-xl font-bold">
                <i class="fas fa-crosshairs"></i> JobHunter
            </div>
            <div class="flex gap-4 text-gray-500 text-lg">
                <button onclick="window.location.reload()" title="Atualizar"><i class="fas fa-sync-alt hover:text-blue-600"></i></button>
                <button onclick="document.getElementById('conf-panel').classList.remove('hidden')" title="Config"><i class="fas fa-cog hover:text-blue-600"></i></button>
                <button onclick="toggleTheme()" title="Tema"><i class="fas fa-moon hover:text-blue-600"></i></button>
            </div>
        </div>
    </nav>

    <main class="max-w-6xl mx-auto pt-8 px-4 grid grid-cols-1 md:grid-cols-4 gap-6 pb-20">
        
        <div class="md:col-span-1 space-y-4">
            <div class="card-base p-6 text-center">
                <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto flex items-center justify-center text-2xl text-blue-600 dark:text-blue-300 mb-3">
                    <i class="fas fa-user-astronaut"></i>
                </div>
                <h3 class="font-bold text-lg dark:text-white">Dashboard</h3>
                <div class="mt-4 flex justify-between px-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    <span>Na Mira:</span> <span class="text-blue-600"><?= $stats['mira'] ?></span>
                </div>
                <div class="flex justify-between px-4 text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
                    <span>Disputando:</span> <span class="text-orange-500"><?= $stats['disputa'] ?></span>
                </div>
            </div>

            <button onclick="document.getElementById('manual-add').classList.toggle('hidden')" class="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
                <i class="fas fa-plus mr-2"></i> Nova Vaga
            </button>

            <button onclick="alertarDesenvolvimento()" class="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition border border-slate-700">
                <i class="fas fa-download mr-2"></i> Baixar Código
            </button>
        </div>

        <div class="md:col-span-3">
            
            <form class="mb-6 relative">
                <i class="fas fa-search absolute left-4 top-3.5 text-gray-400"></i>
                <input type="text" name="busca" value="<?= htmlspecialchars($busca) ?>" placeholder="Buscar cargo, empresa ou plataforma..." class="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 ring-blue-500">
            </form>

            <form id="manual-add" method="POST" class="hidden card-base p-6 mb-6 animate-fade-in bg-blue-50 dark:bg-gray-800">
                <h4 class="font-bold mb-4 dark:text-white">Adicionar Vaga Manualmente</h4>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <input type="text" name="titulo" placeholder="Título" required class="p-3 rounded border w-full dark:bg-slate-900 dark:text-white">
                    <input type="text" name="empresa" placeholder="Empresa" required class="p-3 rounded border w-full dark:bg-slate-900 dark:text-white">
                    <input type="text" name="link" placeholder="Link" class="p-3 rounded border w-full dark:bg-slate-900 dark:text-white">
                    <input type="text" name="plataforma" placeholder="Plataforma" class="p-3 rounded border w-full dark:bg-slate-900 dark:text-white">
                </div>
                <button name="add_manual" class="bg-blue-600 text-white px-6 py-2 rounded font-bold">Salvar</button>
            </form>

            <div class="space-y-4">
                <?php if(empty($vagas)): ?>
                    <div class="text-center py-10 text-gray-400">
                        <i class="fas fa-ghost text-4xl mb-3"></i>
                        <p>Nenhuma vaga encontrada.</p>
                    </div>
                <?php endif; ?>

                <?php foreach($vagas as $v): 
                    // CORREÇÃO DO CÓDIGO QUE ESTAVA VAZANDO
                    $statusColor = match($v['status']) { 
                        '🏹 Disputando' => 'text-orange-600 bg-orange-50 border-orange-100', 
                        '⚔️ Entrevista' => 'text-blue-600 bg-blue-50 border-blue-100', 
                        '✅ Contratado' => 'text-green-600 bg-green-50 border-green-100', 
                        '💀 Baixa' => 'text-red-600 bg-red-50 border-red-100', 
                        default => 'text-gray-600 bg-gray-50 border-gray-200' 
                    }; 
                    $jsonVaga = json_encode($v, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP);
                ?>
                <div class="card-base p-5 flex gap-4 cursor-pointer hover:border-blue-400 group relative" onclick='abrirModal(<?= $jsonVaga ?>)'>
                    <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xl font-bold text-gray-500 shrink-0">
                        <?= strtoupper(substr($v['empresa'], 0, 1)) ?>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-lg text-blue-600 dark:text-blue-400 group-hover:underline leading-tight truncate pr-20"><?= $v['titulo'] ?></h3>
                            <div class="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                <form method="POST" onclick="event.stopPropagation()">
                                    <input type="hidden" name="toggle_favorito" value="1"><input type="hidden" name="id" value="<?= $v['id'] ?>">
                                    <button class="text-gray-300 hover:text-red-500 bg-white dark:bg-slate-800 p-1 rounded shadow-sm"><i class="<?= $v['favorito']?'fas fa-heart text-red-500':'far fa-heart' ?>"></i></button>
                                </form>
                                <form method="POST" onclick="event.stopPropagation()">
                                    <input type="hidden" name="ex_vaga" value="1"><input type="hidden" name="id" value="<?= $v['id'] ?>">
                                    <button class="text-gray-300 hover:text-red-500 bg-white dark:bg-slate-800 p-1 rounded shadow-sm"><i class="fas fa-trash"></i></button>
                                </form>
                            </div>
                        </div>
                        <p class="text-sm font-semibold text-gray-600 dark:text-gray-300 truncate"><?= $v['empresa'] ?> · <?= $v['local'] ?></p>
                        <div class="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                            <span class="px-2 py-1 rounded border <?= $statusColor ?>"><?= $v['status'] ?></span>
                            <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded"><?= $v['plataforma'] ?></span>
                            <?php if(stripos($v['local'], 'remot') !== false): ?>
                                <span class="bg-purple-100 text-purple-700 px-2 py-1 rounded">🏠 REMOTO</span>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            
            <div class="mt-12">
                <h3 class="font-bold text-xl mb-4 dark:text-white"><i class="fas fa-folder text-yellow-500"></i> Pastas</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <?php foreach($areas as $a): ?>
                    <div class="card-base p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-800 transition" onclick="carregarArea(<?= $a['id'] ?>, '<?= $a['nome'] ?>')">
                        <div class="flex justify-between items-center">
                            <span class="font-bold dark:text-white flex items-center gap-2"><i class="fas fa-folder text-blue-200"></i> <?= $a['nome'] ?></span>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

        </div>
    </main>

    <div id="modal-vaga" class="modal-bg fixed inset-0 hidden flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div class="p-4 border-b dark:border-gray-700 flex justify-between">
                <h3 class="font-bold text-lg dark:text-white">Detalhes</h3>
                <button onclick="closeModal('modal-vaga')" class="text-2xl text-gray-400">&times;</button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 flex gap-6 flex-col md:flex-row">
                <div class="w-full md:w-1/3 space-y-4">
                    <form method="POST">
                        <input type="hidden" name="atualizar_vaga" value="1">
                        <input type="hidden" name="id" id="mod-id">
                        <label class="block text-xs font-bold text-gray-500 uppercase">Status</label>
                        <select name="status" id="mod-status" class="w-full border p-2 rounded mb-3 dark:bg-slate-800 dark:text-white dark:border-gray-600">
                            <option>🎯 Na Mira</option><option>🏹 Disputando</option><option>⚔️ Entrevista</option><option>✅ Contratado</option><option>💀 Baixa</option>
                        </select>
                        <label class="block text-xs font-bold text-gray-500 uppercase">Plataforma</label>
                        <input type="text" name="plataforma" id="mod-plataforma" class="w-full border p-2 rounded mb-3 dark:bg-slate-800 dark:text-white dark:border-gray-600">
                        <label class="block text-xs font-bold text-gray-500 uppercase">Data Limite</label>
                        <input type="date" name="data_limite" id="mod-datalimite" class="w-full border p-2 rounded mb-4 dark:bg-slate-800 dark:text-white dark:border-gray-600">
                        <button class="w-full bg-green-600 text-white font-bold py-2 rounded">Salvar</button>
                    </form>
                    <a id="mod-link" href="#" target="_blank" class="block text-center w-full border border-gray-300 py-2 rounded font-bold hover:bg-gray-100 dark:text-white dark:hover:text-black">Ver Original <i class="fas fa-external-link-alt"></i></a>
                    <input type="hidden" id="mod-id-ia">
                </div>
                <div class="flex-1 dark:text-gray-300">
                    <h2 id="mod-titulo" class="text-2xl font-bold text-gray-900 dark:text-white mb-2"></h2>
                    <p id="mod-empresa" class="text-blue-600 font-bold mb-4"></p>
                    <div id="mod-desc" class="prose max-w-none text-sm whitespace-pre-line"></div>
                </div>
            </div>
        </div>
    </div>

    <div id="conf-panel" class="modal-bg fixed inset-0 hidden flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl p-6">
            <div class="flex justify-between mb-4">
                <h3 class="font-bold text-xl dark:text-white">Configurações</h3>
                <button onclick="closeModal('conf-panel')" class="text-2xl">&times;</button>
            </div>
            <form method="POST" class="space-y-4">
                <div>
                    <label class="font-bold text-sm text-gray-600 dark:text-gray-300">Chave SerpAPI</label>
                    <input type="password" name="serp_key" value="<?= htmlspecialchars($conf['serp_api_key']??'') ?>" class="w-full border p-2 rounded dark:bg-slate-800 dark:text-white">
                </div>
                <div>
                    <label class="font-bold text-sm text-gray-600 dark:text-gray-300">Cidade Padrão</label>
                    <input type="text" name="cidade" value="<?= htmlspecialchars($conf['cidade_padrao']??'') ?>" class="w-full border p-2 rounded dark:bg-slate-800 dark:text-white">
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" name="remoto" id="chkRemoto" <?= ($conf['incluir_remoto']??0)?'checked':'' ?>>
                    <label for="chkRemoto" class="dark:text-white">Incluir Remoto?</label>
                </div>
                <button name="salvar_config" class="w-full bg-blue-600 text-white font-bold py-3 rounded">Salvar</button>
            </form>
        </div>
    </div>
    
    <div id="modal-area" class="modal-bg fixed inset-0 hidden flex items-center justify-center p-4">
        <div class="bg-gray-100 dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-xl flex flex-col overflow-hidden">
            <div class="bg-white dark:bg-slate-800 p-4 flex justify-between items-center border-b dark:border-gray-700">
                <h3 id="area-titulo" class="font-bold text-xl dark:text-white">Pasta</h3>
                <button onclick="closeModal('modal-area')" class="text-2xl">&times;</button>
            </div>
            <div id="area-grid" class="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto"></div>
        </div>
    </div>

    <script>
        window.AREA_DB = {};
        <?php foreach($area_items as $i) { 
            $jsonVagaPasta = json_encode($i, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP); 
            echo "window.AREA_DB[{$i['item_id']}] = $jsonVagaPasta;\n"; 
        } ?>
    </script>
    <script src="script.js"></script>
</body>
</html>
