export default function Page() {
    return <div className="p-6">
        <h1 className="text-[16px] font-semibold">Dashboard</h1>
        <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white dark:bg-[#1c1917] border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                <p className="text-[12px] text-stone-500">Tenants</p>
                <p className="text-xl font-bold mt-1">4</p>
            </div>
            <div className="bg-white dark:bg-[#1c1917] border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                <p className="text-[12px] text-stone-500">Usuários</p>
                <p className="text-xl font-bold mt-1">2</p>
            </div>
            <div className="bg-white dark:bg-[#1c1917] border border-stone-200 dark:border-stone-800 rounded-2xl p-5">
                <p className="text-[12px] text-stone-500">Papéis</p>
                <p className="text-xl font-bold mt-1">4</p>
            </div>
        </div>
    </div>
}