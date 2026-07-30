import React from 'react'

export default function NoPage() {
    return (
        <div className='flex flex-col justify-center items-center h-[calc(100vh-68px)] md:h-[calc(100vh-84px)] mt-17 md:mt-21'>
            <h2 className='text-5xl text-red-500'>404</h2>
            <p>Page not found (Invalid path)</p>
        </div>
    )
}