// config.js - Configurações do Firebase
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDPPbSA8SB-L_giAhWIqGbPGSMRBDTPi40",
    authDomain: "master-ecossistemaprofessor.firebaseapp.com",
    databaseURL: "https://master-ecossistemaprofessor-default-rtdb.firebaseio.com",
    projectId: "master-ecossistemaprofessor",
    storageBucket: "master-ecossistemaprofessor.firebasestorage.app",
    messagingSenderId: "532224860209",
    appId: "1:532224860209:web:686657b6fae13b937cf510",
    measurementId: "G-B0KMX4E67D"
};

// app.js - Aplicação principal
class FormularioApp {
    constructor() {
        this.firebaseApp = null;
        this.firestore = null;
        this.currentSection = 1;
        this.formData = {
            nome: '',
            cpf: '',
            email: '',
            endereco: '',
            disciplinas: [],
            cep: '',
            enderecoOficial: '',
            contato: '',
            pix: '',
            nivel: '',
            curso: '',
            dataNascimento: '',
            expAulas: 'não',
            descricaoExpAulas: '',
            expNeuro: 'não',
            descricaoExpNeuro: '',
            expTdics: 'não',
            descricaoTdics: '',
            disponibilidade: {
                segManha: false, segTarde: false,
                terManha: false, terTarde: false,
                quaManha: false, quaTarde: false,
                quiManha: false, quiTarde: false,
                sexManha: false, sexTarde: false,
                sabManha: false, sabTarde: false
            },
            bairros: [],
            status: 'Candidato'
        };
        
        this.init();
    }

    async init() {
        await this.initializeFirebase();
        this.setupEventListeners();
        this.initializeUI();
        console.log('✅ Aplicação inicializada');
    }

    // ========== FIREBASE ==========
    async initializeFirebase() {
        try {
            console.log('🔥 Inicializando Firebase...');
            
            if (typeof firebase === 'undefined') {
                throw new Error('Biblioteca Firebase não encontrada. Verifique se o script CDN foi carregado.');
            }
            
            console.log('✅ Firebase App disponível');
            
            if (typeof firebase.firestore !== 'function') {
                throw new Error('Firestore não disponível. Verifique se firebase-firestore-compat.js foi carregado.');
            }
            
            console.log('✅ Firestore disponível');
            
            this.firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
            this.firestore = firebase.firestore();
            
            console.log('✅ Firebase Firestore inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
            
            if (error.code === 'app/duplicate-app') {
                console.log('⚠️ Firebase já inicializado, usando instância existente');
                this.firebaseApp = firebase.app();
                this.firestore = firebase.firestore();
                return true;
            }
            
            this.firebaseApp = null;
            this.firestore = null;
            return false;
        }
    }

    async testFirebaseConnection() {
        if (!this.firestore) {
            console.error('❌ Firestore não inicializado');
            return false;
        }
        
        try {
            console.log('🔍 Testando conexão com Firestore...');
            
            const testRef = this.firestore.collection('connectionTest').doc('test');
            const testData = {
                timestamp: new Date(),
                test: true,
                message: 'Teste de conexão'
            };
            
            await testRef.set(testData);
            console.log('✅ Dados de teste escritos com sucesso');
            
            const doc = await testRef.get();
            const testResult = doc.data();
            console.log('✅ Dados de teste lidos com sucesso:', testResult);
            
            await testRef.delete();
            console.log('✅ Dados de teste removidos');
            
            if (testResult && testResult.test === true) {
                console.log('✅ Conexão com Firestore: OK');
                return true;
            }
            
            throw new Error('Teste de conexão falhou');
        } catch (error) {
            console.error('❌ Erro na conexão com Firestore:', error);
            
            if (error.code === 'permission-denied') {
                console.error('🔒 Erro de permissão: Verifique as regras de segurança do Firestore');
            }
            
            return false;
        }
    }

    // ========== VERIFICAÇÃO DE CPF EXISTENTE ==========
    async checkCPFExists(cpf) {
        if (!this.firestore) {
            console.error('❌ Firestore não inicializado');
            return false;
        }

        try {
            console.log('🔍 Verificando se CPF existe no banco:', cpf);
            
            const querySnapshot = await this.firestore
                .collection('candidatos')
                .where('cpf', '==', cpf)
                .get();
            
            const exists = !querySnapshot.empty;
            console.log(`✅ Verificação CPF: ${exists ? 'EXISTE' : 'NÃO EXISTE'}`);
            
            return exists;
        } catch (error) {
            console.error('❌ Erro ao verificar CPF:', error);
            return false;
        }
    }

    // ========== UI FUNCTIONS ==========
    showSection(sectionNumber) {
        document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.progress-step').forEach(step => step.classList.remove('active'));
        
        const sectionEl = document.getElementById(`section${sectionNumber}`);
        if (sectionEl) sectionEl.classList.add('active');
        
        const progressStep = document.querySelector(`.progress-step:nth-child(${Math.min(sectionNumber,4)})`);
        if (progressStep) progressStep.classList.add('active');
        
        this.currentSection = sectionNumber;
        console.log(`📄 Navegou para seção ${sectionNumber}`);
    }

    toggleGroup(headerElement) {
        const groupEl = headerElement.closest('.group');
        if (!groupEl) return;
        
        const items = groupEl.querySelector('.items');
        if (!items) return;
        
        const isHidden = items.classList.contains('hidden');
        items.classList.toggle('hidden', !isHidden);
        groupEl.classList.toggle('expanded', isHidden);
        groupEl.classList.toggle('collapsed', !isHidden);
    }

    initializeUI() {
        document.querySelectorAll('.group').forEach(g => g.classList.add('collapsed'));
        this.validateSection2();
        this.validateSection3();
    }

    // ========== MÁSCARA DATA NASCIMENTO ==========
    setupMaskDataNascimento() {
        const dataField = document.getElementById('dataNascimento');
        if (!dataField) return;

        dataField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            
            // Aplica máscara DD/MM/AAAA
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2);
            }
            if (value.length > 5) {
                value = value.substring(0, 5) + '/' + value.substring(5, 9);
            }
            
            e.target.value = value;
            this.validateSection3();
        });
    }

    // ========== MÁSCARA TELEFONE ==========
    setupMaskTelefone() {
        const telefoneField = document.getElementById('contato');
        if (!telefoneField) return;

        telefoneField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            let formatted = '';
            if (value.length > 0) {
                formatted = '(' + value.substring(0, 2);
            }
            if (value.length > 2) {
                if (value.length >= 11) {
                    formatted += ') ' + value.substring(2, 7) + '-' + value.substring(7, 11);
                } else {
                    formatted += ') ' + value.substring(2, 6) + (value.length > 6 ? '-' + value.substring(6) : '');
                }
            }
            
            e.target.value = formatted;
            this.validateSection3();
        });
    }

    // ========== MÁSCARA E BUSCA DE CEP ==========
    setupMaskCEP() {
        const cepField = document.getElementById('cep');
        if (!cepField) return;

        const tryBuscar = (val) => {
            const numeric = (val || '').replace(/\D/g, '');
            if (numeric.length === 8) {
                const formatted = numeric.replace(/(\d{5})(\d)/, '$1-$2');
                cepField.value = formatted;
                this.buscarCEP(numeric);
            }
        };

        cepField.addEventListener('input', e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 8) value = value.slice(0, 8);
            if (value.length > 5) {
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
            }
            e.target.value = value;
            this.validateSection3();

            if (value.replace(/\D/g, '').length === 8) {
                this.buscarCEP(value.replace(/\D/g, ''));
            }
        });

        cepField.addEventListener('paste', (ev) => {
            setTimeout(() => tryBuscar(cepField.value), 50);
        });

        cepField.addEventListener('blur', (ev) => {
            tryBuscar(ev.target.value);
        });
    }

    async buscarCEP(cepNumeros) {
        try {
            const cepClean = String(cepNumeros).replace(/\D/g, '');
            if (cepClean.length !== 8) return;

            const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepClean}`);
            if (!response.ok) throw new Error('CEP não encontrado');

            const data = await response.json();
            const enderecoFormatado = `${data.street}, ${data.neighborhood}, ${data.city} - ${data.state}`;

            const enderecoOficialField = document.getElementById('enderecoOficial');
            if (enderecoOficialField) {
                enderecoOficialField.value = enderecoFormatado;
                this.formData.enderecoOficial = enderecoFormatado;
                enderecoOficialField.dispatchEvent(new Event('input', { bubbles: true }));
            }

            console.log('✅ Endereço encontrado via BrasilAPI:', enderecoFormatado);
            this.validateSection3();
        } catch (error) {
            console.error('❌ Erro ao buscar CEP:', error);
            const enderecoOficialField = document.getElementById('enderecoOficial');
            if (enderecoOficialField) {
                enderecoOficialField.value = '';
                this.formData.enderecoOficial = '';
                enderecoOficialField.dispatchEvent(new Event('input', { bubbles: true }));
            }
            alert('CEP não encontrado. Verifique o CEP digitado.');
        }
    }

    // ========== MÁSCARA CPF ==========
    setupMaskCPF() {
        const cpfField = document.getElementById('cpf');
        if (!cpfField) return;

        cpfField.addEventListener('input', async e => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            
            e.target.value = value;
            
            // Verifica se CPF está completo e válido
            const cpfNumeros = value.replace(/\D/g, '');
            const cpfMessage = document.getElementById('cpfMessage');
            
            if (cpfNumeros.length === 11) {
                // CPF completo, verificar no banco
                const cpfExists = await this.checkCPFExists(cpfNumeros);
                
                if (cpfExists) {
                    cpfMessage.textContent = 'CPF já cadastrado';
                    cpfMessage.className = 'cpf-message error';
                    document.getElementById('section2-next').disabled = true;
                } else {
                    cpfMessage.textContent = 'CPF válido';
                    cpfMessage.className = 'cpf-message success';
                    this.validateSection2();
                }
            } else {
                cpfMessage.textContent = '';
                document.getElementById('section2-next').disabled = true;
            }
        });
    }

    // ========== VALIDAÇÃO SEÇÃO 2 (CPF) ==========
    validateSection2() {
        const section2NextBtn = document.getElementById('section2-next');
        if (!section2NextBtn) return;

        const cpfField = document.getElementById('cpf');
        const cpfValid = cpfField && cpfField.value.replace(/\D/g, '').length === 11;
        
        // Verifica se a mensagem de CPF é de sucesso
        const cpfMessage = document.getElementById('cpfMessage');
        const cpfNotRegistered = cpfMessage && cpfMessage.classList.contains('success');

        section2NextBtn.disabled = !(cpfValid && cpfNotRegistered);
    }

    // ========== VALIDAÇÃO SEÇÃO 3 (DADOS PESSOAIS) ==========
    validateSection3() {
        const section3NextBtn = document.getElementById('section3-next');
        if (!section3NextBtn) return;

        const nomeField = document.getElementById('nome');
        const emailField = document.getElementById('email');
        const contatoField = document.getElementById('contato');
        const dataNascimentoField = document.getElementById('dataNascimento');
        const cepField = document.getElementById('cep');
        const enderecoOficialField = document.getElementById('enderecoOficial');
        const enderecoField = document.getElementById('endereco');

        const nomeValid = nomeField && nomeField.value.trim() !== '';
        const emailValid = emailField && emailField.value.trim() !== '' && emailField.checkValidity();
        const contatoValid = contatoField && contatoField.value.replace(/\D/g, '').length >= 10;
        const dataNascimentoValid = dataNascimentoField && this.validateDataNascimento(dataNascimentoField.value);
        const cepValid = cepField && cepField.value.replace(/\D/g, '').length === 8;
        const enderecoOficialValid = enderecoOficialField && enderecoOficialField.value.trim() !== '';
        const enderecoValid = enderecoField && enderecoField.value.trim() !== '';

        section3NextBtn.disabled = !(nomeValid && emailValid && contatoValid && dataNascimentoValid && cepValid && enderecoOficialValid && enderecoValid);
    }

    // ========== VALIDAÇÃO DATA NASCIMENTO ==========
    validateDataNascimento(data) {
        if (!data || data.length !== 10) return false;
        
        const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        if (!regex.test(data)) return false;
        
        const [, dia, mes, ano] = data.match(regex);
        const dataObj = new Date(ano, mes - 1, dia);
        
        // Verifica se a data é válida
        return dataObj.getDate() == dia && 
               dataObj.getMonth() == mes - 1 && 
               dataObj.getFullYear() == ano &&
               dataObj <= new Date(); // Data não pode ser no futuro
    }

    // ========== VALIDAÇÃO SEÇÃO 5 ==========
    validateSection5() {
        const pixField = document.getElementById('pix');
        const nivelSelected = document.querySelector('input[name="nivel"]:checked');
        const cursoField = document.getElementById('curso');
        const aceiteTermos = document.getElementById('aceiteTermos');

        const disciplinasSelecionadas = this.formData.disciplinas.length > 0;

        const expAulasValido = !document.getElementById('expAulasToggle').checked ||
                            (document.getElementById('expAulasText').value.trim() !== '');
        const expNeuroValido = !document.getElementById('expNeuroToggle').checked ||
                            (document.getElementById('expNeuroText').value.trim() !== '');
        const expTdicsValido = !document.getElementById('expTdicsToggle').checked ||
                            (document.getElementById('expTdicsText').value.trim() !== '');

        return (
            pixField.value.trim() !== '' &&
            nivelSelected !== null &&
            cursoField.value.trim() !== '' &&
            disciplinasSelecionadas &&
            aceiteTermos.checked &&
            expAulasValido && expNeuroValido && expTdicsValido
        );
    }

    // ========== DROPDOWN DISCIPLINAS ==========
    setupDropdownDisciplinas() {
        const dropdownWrapper = document.querySelector('.dropdown');
        const dropdownBtn = document.getElementById('dropdownBtn');
        const dropdownContent = document.getElementById('dropdownContent');

        if (!dropdownBtn || !dropdownWrapper || !dropdownContent) return;

        this.updateDropdownText();

        dropdownBtn.addEventListener('click', e => {
            e.stopPropagation();
            dropdownWrapper.classList.toggle('open');
            dropdownContent.style.display = dropdownWrapper.classList.contains('open') ? 'block' : 'none';
            dropdownContent.setAttribute('aria-hidden', dropdownWrapper.classList.contains('open') ? 'false' : 'true');
        });

        dropdownContent.addEventListener('click', e => e.stopPropagation());

        const discCheckboxes = dropdownContent.querySelectorAll('input[name="disciplinas"]');
        discCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                this.updateDisciplinasData();
                this.updateDropdownText();
            });
        });

        document.addEventListener('click', () => {
            dropdownWrapper.classList.remove('open');
            dropdownContent.style.display = 'none';
            dropdownContent.setAttribute('aria-hidden', 'true');
        });
    }

    updateDropdownText() {
        const dropdownBtn = document.getElementById('dropdownBtn');
        const dropdownContent = document.getElementById('dropdownContent');
        
        if (!dropdownBtn || !dropdownContent) return;

        const checkboxes = dropdownContent.querySelectorAll('input[name="disciplinas"]');
        const selecionadas = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
        
        dropdownBtn.textContent = selecionadas.length 
            ? selecionadas.join(', ') 
            : 'Selecione as disciplinas que você pode lecionar';
    }

    updateDisciplinasData() {
        const checkboxes = document.querySelectorAll('input[name="disciplinas"]:checked');
        this.formData.disciplinas = Array.from(checkboxes).map(cb => cb.value);
    }

    // ========== EXPERIÊNCIAS TOGGLES ==========
    setupExperienceToggles() {
        this.setupToggle('expAulasToggle', 'expAulasBox', 'expAulas', 'descricaoExpAulas');
        this.setupToggle('expNeuroToggle', 'expNeuroBox', 'expNeuro', 'descricaoExpNeuro');
        this.setupToggle('expTdicsToggle', 'expTdicsBox', 'expTdics', 'descricaoTdics');
    }

    setupToggle(toggleId, boxId, dataKey, descKey) {
        const toggle = document.getElementById(toggleId);
        const box = document.getElementById(boxId);
        const textarea = box ? box.querySelector('textarea') : null;

        if (!toggle || !box || !textarea) return;

        toggle.addEventListener('change', () => {
            const isChecked = toggle.checked;
            box.classList.toggle('hidden', !isChecked);
            this.formData[dataKey] = isChecked ? 'sim' : 'não';
            
            textarea.required = isChecked;

            if (!isChecked) {
                textarea.value = '';
                this.formData[descKey] = '';
            }
        });

        textarea.addEventListener('input', (e) => {
            this.formData[descKey] = e.target.value.trim();
        });
    }

    // ========== SECTION 2 (CPF) ==========
    setupSection2() {
        const section2NextBtn = document.getElementById('section2-next');
        if (!section2NextBtn) return;

        section2NextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (section2NextBtn.disabled) return;

            // Salva CPF nos dados do formulário
            const cpfField = document.getElementById('cpf');
            this.formData.cpf = cpfField ? cpfField.value.replace(/\D/g, '') : '';

            console.log('=== 📋 DADOS SEÇÃO 2 ===');
            console.log('CPF:', this.formData.cpf);
            console.log('=======================');

            this.showSection(3);
        });
    }

    // ========== SECTION 3 (DADOS PESSOAIS) ==========
    setupSection3() {
        const section3NextBtn = document.getElementById('section3-next');
        if (!section3NextBtn) return;

        section3NextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (section3NextBtn.disabled) return;

            this.saveSection3Data();

            console.log('=== 📋 DADOS SEÇÃO 3 ===');
            console.log('Nome:', this.formData.nome);
            console.log('Email:', this.formData.email);
            console.log('Contato:', this.formData.contato);
            console.log('Data Nascimento:', this.formData.dataNascimento);
            console.log('CEP:', this.formData.cep);
            console.log('Endereço Oficial:', this.formData.enderecoOficial);
            console.log('Complemento:', this.formData.endereco);
            console.log('=======================');

            this.showSection(4);
        });
    }

    saveSection3Data() {
        const nomeField = document.getElementById('nome');
        const emailField = document.getElementById('email');
        const contatoField = document.getElementById('contato');
        const dataNascimentoField = document.getElementById('dataNascimento');
        const cepField = document.getElementById('cep');
        const enderecoOficialField = document.getElementById('enderecoOficial');
        const enderecoField = document.getElementById('endereco');

        this.formData.nome = nomeField ? nomeField.value.trim() : '';
        this.formData.email = emailField ? emailField.value.trim() : '';
        this.formData.contato = contatoField ? contatoField.value.replace(/\D/g, '') : '';
        this.formData.dataNascimento = dataNascimentoField ? dataNascimentoField.value : '';
        this.formData.cep = cepField ? cepField.value.replace(/\D/g, '') : '';
        this.formData.enderecoOficial = enderecoOficialField ? enderecoOficialField.value.trim() : '';
        this.formData.endereco = enderecoField ? enderecoField.value.trim() : '';
    }

    // ========== SECTION 4 (DISPONIBILIDADE) ==========
    setupSection4() {
        this.setupDisponibilidade();
        this.setupBairros();
    }

    setupDisponibilidade() {
        const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const tableRows = document.querySelectorAll('#section4 .schedule-table tbody tr');

        tableRows.forEach((row, index) => {
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach((checkbox, turnoIndex) => {
                const turno = turnoIndex === 0 ? 'Manha' : 'Tarde';
                const key = `${dias[index]}${turno}`;
                this.formData.disponibilidade[key] = !!checkbox.checked;
                
                checkbox.addEventListener('change', () => {
                    this.formData.disponibilidade[key] = checkbox.checked;
                });
            });
        });
    }

    setupBairros() {
        const bairrosCheckboxes = document.querySelectorAll('input[name="bairros"]');
        
        bairrosCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBairrosData();
            });
        });
    }

    updateBairrosData() {
        const bairrosSelecionados = Array.from(document.querySelectorAll('input[name="bairros"]:checked'))
            .map(cb => {
                const descElement = cb.closest('.item-row')?.querySelector('.desc');
                return descElement ? descElement.textContent.trim() : '';
            })
            .filter(Boolean);
        
        this.formData.bairros = bairrosSelecionados;
    }

    // ========== SECTION 5 ==========
    setupSection5() {
        this.setupNivelCurso();
        this.setupPixValidation();
    }

    setupNivelCurso() {
        const nivelRadios = document.querySelectorAll('input[name="nivel"]');
        nivelRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.formData.nivel = e.target.value;
                }
            });
        });

        const cursoField = document.getElementById('curso');
        if (cursoField) {
            cursoField.addEventListener('input', (e) => {
                this.formData.curso = e.target.value.trim();
            });
        }
    }

    setupPixValidation() {
        const pixField = document.getElementById('pix');
        if (pixField) {
            pixField.addEventListener('input', () => {
                this.formData.pix = pixField.value.trim();
            });
        }
    }

    // ========== FORM SUBMIT ==========
    setupFormSubmit() {
        const form = document.getElementById('meuFormulario');
        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            if (!this.validateSection5()) {
                alert('Por favor, preencha todos os campos obrigatórios: Nível acadêmico, Curso e PIX.');
                return;
            }
            
            await this.handleFormSubmit();
        });
    }

    async handleFormSubmit() {
        const submitBtn = document.querySelector('button[type="submit"]');
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
        }

        try {
            console.log('🔍 Verificando conexão com Firestore...');
            const connectionOk = await this.testFirebaseConnection();
            
            if (!connectionOk) {
                throw new Error('Erro de conexão com o banco de dados. Verifique sua conexão com a internet e tente novamente.');
            }

            this.captureAllDataForLog();
            
            console.log('=== 📊 DADOS COMPLETOS CAPTURADOS ===');
            
            // CORREÇÃO DO TIMESTAMP - usando objeto Date nativo
            const timestamp = new Date();
            
            const finalData = {
                nome: this.formData.nome || 'Não informado',
                cpf: this.formData.cpf || '',
                email: this.formData.email || '',
                endereco: `${this.formData.enderecoOficial}, CEP: ${this.formData.cep}. Complemento: ${this.formData.endereco}`,
                contato: this.formData.contato || '',
                pix: this.formData.pix || '',
                dataNascimento: this.formData.dataNascimento || '',
                bairros: this.formData.bairros.join(', ') || '',
                segManha: !!this.formData.disponibilidade.segManha,
                segTarde: !!this.formData.disponibilidade.segTarde,
                terManha: !!this.formData.disponibilidade.terManha,
                terTarde: !!this.formData.disponibilidade.terTarde,
                quaManha: !!this.formData.disponibilidade.quaManha,
                quaTarde: !!this.formData.disponibilidade.quaTarde,
                quiManha: !!this.formData.disponibilidade.quiManha,
                quiTarde: !!this.formData.disponibilidade.quiTarde,
                sexManha: !!this.formData.disponibilidade.sexManha,
                sexTarde: !!this.formData.disponibilidade.sexTarde,
                sabManha: !!this.formData.disponibilidade.sabManha,
                sabTarde: !!this.formData.disponibilidade.sabTarde,
                disciplinas: this.formData.disciplinas.join(', ') || '',
                nivel: this.formData.nivel || '',
                curso: this.formData.curso || '',
                expAulas: this.formData.expAulas || 'não',
                descricaoExpAulas: this.formData.descricaoExpAulas || '',
                expNeuro: this.formData.expNeuro || 'não',
                descricaoExpNeuro: this.formData.descricaoExpNeuro || '',
                expTdics: this.formData.expTdics || 'não',
                descricaoTdics: this.formData.descricaoTdics || '',
                status: 'Candidato',
                timestamp: timestamp, // Usando objeto Date nativo
                dataEnvio: timestamp.toISOString(), // String formatada
                dataEnvioLegivel: timestamp.toLocaleString('pt-BR') // Data legível em português
            };

            console.log('📤 ENVIANDO PARA FIRESTORE:', finalData);

            const docRef = await this.firestore.collection('candidatos').add(finalData);

            console.log('✅ Dados enviados com sucesso para Firestore');
            console.log('📝 ID do documento:', docRef.id);
            console.log('⏰ Timestamp:', timestamp);
            
            this.showSection(6);

        } catch (error) {
            console.error('❌ Erro ao enviar formulário:', error);
            alert(`Erro ao enviar: ${error.message || error}\n\nPor favor, tente novamente.`);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Cadastro';
            }
        }
    }

    captureAllDataForLog() {
        this.saveSection3Data();
        this.updateDisciplinasData();
        this.updateBairrosData();
        
        const nivelSelected = document.querySelector('input[name="nivel"]:checked');
        this.formData.nivel = nivelSelected ? nivelSelected.value : '';
        
        const cursoField = document.getElementById('curso');
        this.formData.curso = cursoField ? cursoField.value.trim() : '';
        
        const pixField = document.getElementById('pix');
        this.formData.pix = pixField ? pixField.value.trim() : '';
    }

    // ========== EVENT LISTENERS SETUP ==========
    setupEventListeners() {
        // Seção 2 (CPF)
        const cpfField = document.getElementById('cpf');
        if (cpfField) {
            cpfField.addEventListener('input', () => this.validateSection2());
        }

        // Seção 3 (Dados Pessoais)
        const section3Fields = ['nome', 'email', 'contato', 'dataNascimento', 'cep', 'enderecoOficial', 'endereco'];
        section3Fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('input', () => this.validateSection3());
            }
        });

        this.setupMaskCPF();
        this.setupMaskTelefone();
        this.setupMaskDataNascimento();
        this.setupMaskCEP();

        this.setupDropdownDisciplinas();
        this.setupExperienceToggles();

        this.setupSection2();
        this.setupSection3();
        this.setupSection4();
        this.setupSection5();
        this.setupFormSubmit();

        console.log('✅ Event listeners configurados');
    }
}

// ========== INICIALIZAÇÃO DA APLICAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicação...');
    window.formApp = new FormularioApp();
});

// ========== FUNÇÕES GLOBAIS PARA HTML ==========
function showSection(sectionNumber) {
    if (window.formApp) {
        window.formApp.showSection(sectionNumber);
    }
}

function toggleGroup(headerElement) {
    if (window.formApp) {
        window.formApp.toggleGroup(headerElement);
    }
}