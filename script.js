// script.js

// Gerenciamento do Tema (Dark/Light)
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
});

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
}

// Modais (Janelas que abrem por cima)
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function abrirModal(vaga) {
    if(!vaga) return;
    // Preenche os campos do modal com os dados da vaga
    document.getElementById('mod-id').value = vaga.id;
    document.getElementById('mod-id-ia').value = vaga.id;
    document.getElementById('mod-titulo').innerText = vaga.titulo;
    document.getElementById('mod-empresa').innerHTML = `<i class="fas fa-building"></i> ${vaga.empresa}`;
    document.getElementById('mod-status').value = vaga.status;
    document.getElementById('mod-plataforma').value = vaga.plataforma;
    document.getElementById('mod-datalimite').value = vaga.data_limite || '';
    document.getElementById('mod-link').href = vaga.link;
    
    // Tratamento da descrição (troca quebra de linha por <br>)
    const descDiv = document.getElementById('mod-desc');
    if(vaga.descricao && vaga.descricao !== "null" && vaga.descricao.trim() !== "") {
        descDiv.innerHTML = vaga.descricao.replace(/\n/g, '<br>');
    } else {
        descDiv.innerHTML = '<p class="text-gray-400 italic">Sem descrição.</p>';
    }
    
    document.getElementById('modal-vaga').classList.remove('hidden');
}

// Drag and Drop das Pastas
function carregarArea(id, nome) {
    const grid = document.getElementById('area-grid');
    document.getElementById('area-titulo').innerText = nome;
    document.getElementById('modal-area').classList.remove('hidden');
    grid.innerHTML = '';

    // AREA_DB é uma variável global que virá do PHP
    const itens = Object.values(window.AREA_DB || {}).filter(i => i.area_id == id);

    if(itens.length === 0){
        grid.innerHTML = '<div class="col-span-full py-10 text-center text-gray-400">Pasta Vazia</div>';
        return;
    }

    itens.forEach(v => {
        let safeVaga = JSON.stringify(v).replace(/"/g, '&quot;');
        grid.innerHTML += `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm group" data-id="${v.item_id}">
                <div class="flex justify-between">
                    <h4 class="font-bold text-blue-600 dark:text-blue-400 cursor-pointer" onclick='abrirModal(${safeVaga})'>${v.titulo}</h4>
                    <form method="POST">
                        <input type="hidden" name="excluir_da_pasta" value="1">
                        <input type="hidden" name="id" value="${v.item_id}">
                        <button class="text-gray-300 hover:text-red-500"><i class="fas fa-trash"></i></button>
                    </form>
                </div>
                <p class="text-xs text-gray-500 font-bold">${v.empresa}</p>
            </div>`;
    });

    // Inicia a biblioteca SortableJS para arrastar
    if(typeof Sortable !== 'undefined') {
        new Sortable(grid, {
            animation: 150,
            onEnd: function() {
                let ids = Array.from(grid.querySelectorAll('[data-id]')).map(el => el.dataset.id);
                let fd = new FormData();
                ids.forEach((id, i) => fd.append(`ol[${i}]`, id));
                fetch(window.location.href, { method: 'POST', body: fd });
            }
        });
    }
}
