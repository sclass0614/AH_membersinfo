const SUPABASE_URL = "https://dfomeijvzayyszisqflo.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb21laWp2emF5eXN6aXNxZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NjYwNDIsImV4cCI6MjA2MDQ0MjA0Mn0.-r1iL04wvPNdBeIvgxqXLF2rWqIUX5Ot-qGQRdYo_qk";

let supabaseClient = null;

function initSupabase() {
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return supabaseClient;
}

window.supabase = initSupabase();

async function insertMemberToSupabase(memberData) {
  try {
    const endpoint = SUPABASE_URL + "/rest/v1/membersinfo";

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(memberData),
    };

    const response = await fetch(endpoint, options);

    if (response.ok) {
      return {
        success: true,
        message: "회원 데이터가 Supabase에 성공적으로 삽입되었습니다.",
      };
    } else {
      const responseText = await response.text();
      return {
        success: false,
        message: "Supabase 데이터 삽입 실패: " + responseText,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Supabase 데이터 삽입 중 오류 발생: " + error.message,
    };
  }
}

async function batchInsertMembersToSupabase(membersData) {
  try {
    const endpoint = SUPABASE_URL + "/rest/v1/membersinfo";

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(membersData),
    };

    const response = await fetch(endpoint, options);

    if (response.ok) {
      return {
        success: true,
        message: `${membersData.length}명의 회원 데이터가 Supabase에 성공적으로 삽입되었습니다.`,
      };
    } else {
      const responseText = await response.text();
      return {
        success: false,
        message: "Supabase 데이터 일괄 삽입 실패: " + responseText,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Supabase 데이터 일괄 삽입 중 오류 발생: " + error.message,
    };
  }
}

async function getData_All() {
  try {
    const endpoint = SUPABASE_URL + "/rest/v1/membersinfo?select=*";

    const options = {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
      },
    };

    const response = await fetch(endpoint, options);

    if (response.ok) {
      const data = await response.json();

      return {
        success: true,
        message: `${data.length}개의 데이터를 성공적으로 조회했습니다.`,
        data: data,
      };
    } else {
      const responseText = await response.text();
      return {
        success: false,
        message: "데이터 조회 실패: " + responseText,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "데이터 조회 중 오류 발생: " + error.message,
    };
  }
}

async function displayTestResults() {
  const result = await testFetchMembersFromSupabase();
  const resultDiv = document.getElementById('result');
  
  if (result.success) {
    resultDiv.innerHTML = `
      <h3>테스트 결과</h3>
      <p>${result.message}</p>
      <pre>${JSON.stringify(result.data, null, 2)}</pre>
    `;
  } else {
    resultDiv.innerHTML = `
      <h3>테스트 실패</h3>
      <p>${result.message}</p>
    `;
  }
}

async function checkDuplicateSSN(ssn, currentMemberId = null) {
    try {
        const supabase = initSupabase();
        let query = supabase
            .from('membersinfo')
            .select('회원번호, 회원명, 주민등록번호')
            .eq('주민등록번호', ssn);
            
        if (currentMemberId) {
            query = query.neq('회원번호', currentMemberId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
            isDuplicate: data && data.length > 0,
            existingMember: data && data.length > 0 ? data[0] : null
        };
    } catch (error) {
        throw error;
    }
}

async function processFormData(formData) {
    try {
        const supabase = initSupabase();
        const currentMemberId = document.getElementById("memberId").value;

        if (formData.memberId !== "상담회원" && formData.ssn) {
            const duplicateCheck = await checkDuplicateSSN(formData.ssn, formData.memberId);
            if (duplicateCheck.isDuplicate) {
                return {
                    success: false,
                    message: `이미 등록된 주민등록번호입니다. (회원번호: ${duplicateCheck.existingMember.회원번호}, 회원명: ${duplicateCheck.existingMember.회원명})`
                };
            }
        }

        let memberIdToUse = formData.memberId;
        if (formData.memberId === "신규회원등록중" || formData.memberId === "신규회원전환중") {
            try {
                memberIdToUse = await generateNewMemberId();
            } catch (error) {
                return {
                    success: false,
                    message: '새 회원번호 생성 중 오류가 발생했습니다: ' + error.message
                };
            }
        }

        const processedData = {
            "회원번호": memberIdToUse,
            "회원명": formData.name,
            "장기요양번호": formData.careNumber || null,
            "주민등록번호": formData.ssn,
            "생년월일": formData.birthdate || null,
            "(만)나이": formData.age || null,
            "입소일": formData.admissionDate || null,
            "퇴소일": formData.dischargeDate || null,
            "주소": formData.address,
            "휴대전화번호": formData.mobile,
            "비상연락망": formData.emergencyContact || null,
            "이메일주소": formData.email || null,
            "복용약물정보": formData.medications || null,
            "알레르기정보": formData.allergies || null,
            "진료병원": formData.hospital || null,
            "주요진료이력": formData.medicalHistory || null,
            "보호자관계": formData.guardianRelation || null,
            "보호자명": formData.guardianName || null,
            "보호자연락처": formData.guardianContact || null,
            "동거인관계": formData.livingWith || null,
            "동거인명": formData.livingWithName || null,
            "동거인연락처": formData.livingWithContact || null,
            "회원 주요 기대 및 요구": formData.memberNeeds || null,
            "보호자 주요 기대 및 요구": formData.guardianNeeds || null,
            "주요 하루일과": formData.dailyRoutine || null
        };

        const { data, error } = await supabase
            .from('membersinfo')
            .insert([processedData])
            .select();

        if (error) throw error;
        
        let successMessage = '새로운 회원이 등록되었습니다.';
        if (memberIdToUse !== formData.memberId) {
            successMessage = formData.memberId === "신규회원전환중" 
                ? `상담회원이 정회원 번호 ${memberIdToUse}로 전환되었습니다.`
                : `새로운 회원이 번호 ${memberIdToUse}로 등록되었습니다.`;
        }
        
        return {
            success: true,
            message: successMessage,
            memberId: data[0]["회원번호"]
        };

    } catch (error) {
        return {
            success: false,
            message: '오류가 발생했습니다: ' + error.message
        };
    }
}

async function move_MemberLine(memberId) {
    try {
        const supabase = initSupabase();
        const { data: memberData, error: selectError } = await supabase
            .from('membersinfo')
            .select('*')
            .eq('회원등록_ID', memberId)
            .single();

        if (selectError) throw selectError;
        if (!memberData) throw new Error('회원 정보를 찾을 수 없습니다.');

        const memberNumber = memberData["회원번호"];
        const isConsultationMember = memberNumber && memberNumber.includes("상담회원");

        if (!isConsultationMember) {
            const { error: insertError } = await supabase
                .from('membersinfo_outdated')
                .insert([{
                    ...memberData,
                    archived_date: new Date().toISOString()
                }]);

            if (insertError) throw insertError;
        }

        const { error: deleteError } = await supabase
            .from('membersinfo')
            .delete()
            .eq('회원등록_ID', memberId);

        if (deleteError) throw deleteError;

        return {
            success: true,
            message: isConsultationMember 
                ? '상담회원 데이터가 삭제되었습니다.' 
                : '회원 데이터가 성공적으로 보관되었습니다.'
        };
    } catch (error) {
        return {
            success: false,
            message: '데이터 이동 중 오류가 발생했습니다: ' + error.message
        };
    }
}

async function generateNewMemberId() {
    try {
        const supabase = initSupabase();
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const prefix = "M" + currentYear;

        const { data: newId, error: rpcError } = await supabase.rpc('generate_unique_member_id', {
            input_year_prefix: prefix
        });

        if (rpcError) throw rpcError;
        
        return newId;
    } catch (error) {
        throw error;
    }
} 